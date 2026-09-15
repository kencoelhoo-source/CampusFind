import { describe, expect, it } from "vitest";
import { hrefForNotification, inferNotificationKind, presentNotification } from "@/lib/notification-routing";

describe("notification routing", () => {
  it("routes new claims to the inbox", () => {
    expect(inferNotificationKind('New claim: "Blue bag"')).toBe("claim_submitted");
    expect(hrefForNotification({ title: 'Item found: "ID card"' })).toBe("/dashboard?tab=incoming");
  });

  it("routes claim outcomes to my claims", () => {
    expect(hrefForNotification({ kind: "claim_approved" })).toBe("/dashboard?tab=my-claims");
    expect(hrefForNotification({ kind: "claim_superseded" })).toBe("/dashboard?tab=my-claims");
    expect(hrefForNotification({ title: "Claim declined: wallet" })).toBe("/dashboard?tab=my-claims");
  });

  it("presents a clean card for removed listings", () => {
    const view = presentNotification({
      kind: "item_deleted",
      title: 'Listing removed: "Card"',
      message: 'The poster removed "Card" from the board.',
    });
    expect(view.kicker).toBe("Removed");
    expect(view.title).toBe("Card");
    expect(view.body).toBe("This listing is no longer on the board.");
  });

  it("opens possible matches on the other listing", () => {
    expect(
      hrefForNotification({
        kind: "possible_match",
        related_item_id: "abc",
      }),
    ).toBe("/items/abc");
  });
});
