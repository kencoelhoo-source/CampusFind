export type NotificationKind =
  | "general"
  | "claim_submitted"
  | "claim_approved"
  | "claim_rejected"
  | "claim_withdrawn"
  | "claim_superseded"
  | "item_returned"
  | "item_deleted"
  | "possible_match"
  | "meetup_updated";

export interface NotificationRouteInput {
  kind?: string | null;
  title?: string | null;
  related_item_id?: string | null;
}

export function inferNotificationKind(title: string | null | undefined): NotificationKind {
  const value = title || "";
  if (/^item found:/i.test(value) || /^new claim:/i.test(value)) return "claim_submitted";
  if (/^claim accepted:/i.test(value)) return "claim_approved";
  if (/^claim declined:/i.test(value)) return "claim_rejected";
  if (/^claim withdrawn:/i.test(value)) return "claim_withdrawn";
  if (/^another claim was accepted/i.test(value)) return "claim_superseded";
  if (/^item returned:/i.test(value) || /^marked as returned/i.test(value)) return "item_returned";
  if (/^listing removed:/i.test(value)) return "item_deleted";
  if (/^possible match:/i.test(value)) return "possible_match";
  if (/^meetup updated:/i.test(value)) return "meetup_updated";
  return "general";
}

export function itemNameFromNotificationTitle(title: string | null | undefined) {
  const quoted = title?.match(/"([^"]+)"/);
  if (quoted?.[1]) return quoted[1];
  const afterColon = title?.split(":").slice(1).join(":").trim();
  return afterColon || title || "Item";
}

export function presentNotification(notification: NotificationRouteInput & { message?: string | null }) {
  const kind = (notification.kind as NotificationKind | undefined) || inferNotificationKind(notification.title);
  const item = itemNameFromNotificationTitle(notification.title);
  let message = notification.message?.trim() || "";
  message = message
    .replace(/Meet in a public campus spot\.?/gi, "Hand it over in a public campus place.")
    .replace(/\bmeetup\b/gi, "pickup");

  switch (kind) {
    case "claim_submitted":
      return { kind, kicker: "New claim", title: item, body: message || "Someone contacted you about this listing." };
    case "claim_approved":
      return { kind, kicker: "Accepted", title: item, body: message || "Your claim was accepted." };
    case "claim_rejected":
      return { kind, kicker: "Declined", title: item, body: message || "Your claim was declined." };
    case "claim_withdrawn":
      return { kind, kicker: "Withdrawn", title: item, body: message || "A claim on this listing was withdrawn." };
    case "claim_superseded":
      return { kind, kicker: "Closed", title: item, body: message || "Another claim was accepted for this item." };
    case "item_returned":
      return { kind, kicker: "Returned", title: item, body: message || "The poster marked this as returned." };
    case "item_deleted":
      return { kind, kicker: "Removed", title: item, body: "This listing is no longer on the board." };
    case "possible_match":
      return { kind, kicker: "Possible match", title: item, body: message || "A new listing may match yours." };
    case "meetup_updated":
      return { kind, kicker: "Pickup", title: item, body: message || "Pickup place was updated." };
    default:
      return { kind, kicker: "Alert", title: notification.title || "CampusFind", body: message };
  }
}

export function hrefForNotification(notification: NotificationRouteInput): string {
  const kind = (notification.kind as NotificationKind | undefined) || inferNotificationKind(notification.title);

  switch (kind) {
    case "claim_submitted":
    case "claim_withdrawn":
      return "/dashboard?tab=incoming";
    case "claim_approved":
    case "claim_rejected":
    case "claim_superseded":
    case "meetup_updated":
    case "item_returned":
    case "item_deleted":
      return "/dashboard?tab=my-claims";
    case "possible_match":
      return notification.related_item_id ? `/items/${notification.related_item_id}` : "/items";
    default:
      return notification.related_item_id
        ? `/items/${notification.related_item_id}`
        : "/dashboard?tab=notifications";
  }
}
