import { supabase } from "@/integrations/supabase/client";
import type { NotificationKind } from "@/lib/notification-routing";

export interface NotifyUserInput {
  userId: string;
  title: string;
  message: string;
  relatedItemId?: string | null;
  relatedClaimId?: string | null;
  kind?: NotificationKind | null;
}

export interface NotifyEmailInput {
  kind: NotificationKind;
  claimId?: string;
  itemId?: string;
}

export async function notifyUser({
  userId,
  title,
  message,
  relatedItemId = null,
  relatedClaimId = null,
  kind = null,
}: NotifyUserInput) {
  const { error } = await supabase.rpc("create_notification", {
    _user_id: userId,
    _title: title,
    _message: message,
    _related_item_id: relatedItemId,
    _related_claim_id: relatedClaimId,
    _kind: kind,
  });

  if (error && kind) {
    const retry = await supabase.rpc("create_notification", {
      _user_id: userId,
      _title: title,
      _message: message,
      _related_item_id: relatedItemId,
      _related_claim_id: relatedClaimId,
    });
    if (retry.error) throw retry.error;
    return;
  }

  if (error) {
    throw error;
  }
}

export async function notifyEmail(input: NotifyEmailInput) {
  if (input.kind === "general") return;

  const { error } = await supabase.functions.invoke("notify-email", {
    body: {
      kind: input.kind,
      claimId: input.claimId,
      itemId: input.itemId,
    },
  });

  if (error) {
    console.warn("Could not send notification email:", error);
  }
}

export function showDesktopNotification(title: string, message: string, href: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    const alert = new Notification(title, {
      body: message,
      tag: href,
    });
    alert.onclick = () => {
      window.focus();
      if (href) window.location.assign(href);
      alert.close();
    };
  } catch {
    // Safari private mode and some embedded browsers reject this.
  }
}

export async function requestDesktopNotifications() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported" as const;
  }
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied" as const;
  }
}
