import { supabase } from "@/integrations/supabase/client";

interface NotifyUserInput {
  userId: string;
  title: string;
  message: string;
  relatedItemId?: string | null;
  relatedClaimId?: string | null;
}

export async function notifyUser({
  userId,
  title,
  message,
  relatedItemId = null,
  relatedClaimId = null,
}: NotifyUserInput) {
  const { error } = await supabase.rpc("create_notification", {
    _user_id: userId,
    _title: title,
    _message: message,
    _related_item_id: relatedItemId,
    _related_claim_id: relatedClaimId,
  });

  if (error) {
    throw error;
  }
}
