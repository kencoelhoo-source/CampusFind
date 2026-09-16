import { describe, expect, it } from "vitest";
import { custodyLabel, itemSituation } from "@/features/items/utils/item-custody";

describe("item custody copy", () => {
  it("labels a desk handoff", () => {
    expect(custodyLabel("at_desk", "Library")).toBe("At the Library desk");
    expect(custodyLabel("with_me", null, { isOwner: true })).toBe("With you");
    expect(custodyLabel("with_me", null, { holderName: "Ken Coelho" })).toBe("With Ken Coelho");
    expect(custodyLabel("with_me", null)).toBe("With the finder");
  });

  it("uses held-at on found cards", () => {
    expect(
      itemSituation({
        status: "found",
        location: "Canteen",
        held_where: "at_desk",
        held_at: "Library",
      }),
    ).toBe("Found · Held at Library");
  });

  it("keeps lost copy on last-seen place", () => {
    expect(itemSituation({ status: "lost", location: "Lab Block" })).toBe("Lost · Lab Block");
  });

  it("ignores stale held_where data on lost items", () => {
    expect(itemSituation({ status: "lost", location: "Lab Block", held_where: "with_me" })).toBe("Lost · Lab Block");
  });

  it("labels returned lost items as Resolved", () => {
    expect(itemSituation({ status: "returned", location: "Lab Block" })).toBe("Resolved · Lab Block");
  });

  it("labels returned found items as Returned", () => {
    expect(itemSituation({ status: "returned", location: "Canteen", held_where: "at_desk" })).toBe("Returned · Canteen");
  });
});
