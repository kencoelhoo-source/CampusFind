import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { notifyUser } from "@/lib/notifications";
import { validateClaimMessage } from "@/lib/item-validation";

interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemTitle: string;
  itemOwnerId: string;
  onClaimed: () => void;
}

export function ClaimModal({ open, onOpenChange, itemId, itemTitle, itemOwnerId, onClaimed }: ClaimModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

      const { data: claim, error } = await supabase.from("claims").insert({
        item_id: itemId,
        user_id: user.id,
        message: trimmedMessage,
      }).select("id").single();

      if (error) throw error;

      await notifyUser({
        userId: itemOwnerId,
        title: "New claim on your item",
        message: `Someone claimed "${itemTitle}". Check your dashboard to review.`,
        relatedItemId: itemId,
        relatedClaimId: claim.id,
      });

      toast.success("Claim submitted! The owner will be notified.");
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
          <DialogTitle className="font-display">Claim This Item</DialogTitle>
          <DialogDescription>
            Provide a brief description to prove this item belongs to you. Be specific about identifying features.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="proof">Proof of ownership</Label>
          <Textarea
            id="proof"
            placeholder="e.g., It's a blue AirPods case with a sticker of Radiohead on the back"
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
            {loading ? "Submitting..." : "Submit Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
