import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { notifyEmail, notifyUser } from "@/services/notifications";
import { claimMessageSchema } from "@/lib/validations/item";

export interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemTitle: string;
  itemOwnerId: string;
  itemStatus?: "lost" | "found" | string;
  onClaimed: () => void;
}

export function ClaimModal({
  itemId,
  itemTitle,
  itemStatus = "found",
  itemOwnerId,
  open,
  onOpenChange,
  onClaimed,
}: ClaimModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isLostItem = itemStatus === "lost";

  const handleSubmit = async () => {
    if (!user) return;
    if (user.id === itemOwnerId) {
      toast.error("You cannot claim your own listing.");
      return;
    }

    const validation = claimMessageSchema.safeParse({ message });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Please provide valid claim details.");
      return;
    }

    setLoading(true);
    try {
      const trimmedMessage = message.trim();

      const { data: claim, error } = await supabase
        .from("claims")
        .insert({
          item_id: itemId,
          user_id: user.id,
          message: trimmedMessage,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;

      if (itemOwnerId && itemOwnerId !== user.id && claim?.id) {
        try {
          await notifyUser({
            userId: itemOwnerId,
            title: isLostItem ? `Item found: "${itemTitle}"` : `New claim: "${itemTitle}"`,
            message: isLostItem
              ? `A finder sent a message: "${trimmedMessage.slice(0, 120)}"`
              : `A student submitted a claim: "${trimmedMessage.slice(0, 120)}"`,
            relatedItemId: itemId,
            relatedClaimId: claim.id,
            kind: "claim_submitted",
          });
        } catch (notifErr) {
          console.warn("Could not dispatch in-app notification:", notifErr);
        }

        void notifyEmail({ kind: "claim_submitted", claimId: claim.id });
      }

      toast.success(isLostItem ? "Message sent." : "Claim sent.");
      setMessage("");
      onOpenChange(false);
      onClaimed();
    } catch (err: unknown) {
      if (typeof err === "object" && err && "code" in err && err.code === "23505") {
        toast.error(isLostItem ? "You already sent a message for this item." : "You already submitted a claim for this item.");
      } else {
        toast.error(err instanceof Error ? err.message : isLostItem ? "Failed to send message" : "Failed to submit claim");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isLostItem ? "I found this item" : "This is mine"}
          </DialogTitle>
          <DialogDescription>
            {isLostItem
              ? "Let the owner know where you found it and arrange a safe handover on campus."
              : "Describe it in your own words — color, marks, what’s inside. The finder will accept or decline. Hand it over in a public campus place if it matches."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="proof">
            {isLostItem ? "Message for the owner" : "How you know it’s yours"}
          </Label>
          <Textarea
            id="proof"
            placeholder={
              isLostItem
                ? "e.g. Found near 2nd floor library reading table. I can hand it over at the library counter."
                : "e.g. Navy backpack, torn left strap, physics notebook inside"
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">{message.length}/500 characters</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" className="border border-border/70" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
            {loading ? "Sending…" : isLostItem ? "Send message" : "Send claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
