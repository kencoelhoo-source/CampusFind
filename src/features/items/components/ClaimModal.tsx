import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validateClaimMessage } from "../utils/item-validation";
import { notifyUser } from "@/services/notifications";

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
  open,
  onOpenChange,
  itemId,
  itemTitle,
  itemOwnerId,
  itemStatus = "found",
  onClaimed,
}: ClaimModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isLostItem = itemStatus === "lost";

  const handleSubmit = async () => {
    if (!user) return;

    const validationError = validateClaimMessage(message);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const trimmedMessage = message.trim();

      const { error } = await supabase.from("claims").insert({
        item_id: itemId,
        user_id: user.id,
        message: trimmedMessage,
      });

      if (error) throw error;

      // Dispatch in-app notification to item owner
      if (itemOwnerId && itemOwnerId !== user.id) {
        try {
          await notifyUser({
            userId: itemOwnerId,
            title: isLostItem ? `Item found: "${itemTitle}"` : `New claim: "${itemTitle}"`,
            message: isLostItem
              ? `A finder sent a message: "${trimmedMessage.slice(0, 120)}"`
              : `A student submitted a claim: "${trimmedMessage.slice(0, 120)}"`,
            relatedItemId: itemId,
          });
        } catch (notifErr) {
          console.warn("Could not dispatch notification:", notifErr);
        }
      }

      toast.success(isLostItem ? "Message sent! The owner will be notified." : "Claim sent. The finder will accept or decline.");
      setMessage("");
      onOpenChange(false);
      onClaimed();
    } catch (err: unknown) {
      if (typeof err === "object" && err && "code" in err && err.code === "23505") {
        toast.error("You already submitted a claim for this item.");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to submit claim");
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
              : "Describe it in your own words — color, marks, what’s inside. The finder will accept or decline. You’ll meet on campus if it matches."}
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
                ? "e.g. Found near 2nd floor library reading table. I can meet you at the canteen during recess."
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
            {loading ? "Sending…" : isLostItem ? "Send message" : "Send claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
