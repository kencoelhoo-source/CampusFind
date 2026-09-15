import { describe, expect, it, beforeEach } from "vitest";
import { clearPostDraft, readPostDraft, writePostDraft } from "@/features/items/utils/post-draft";

const userId = "user-1";

beforeEach(() => {
  sessionStorage.clear();
});

describe("post form draft", () => {
  it("round-trips fields across a simulated refresh", () => {
    writePostDraft(userId, {
      itemType: "found",
      title: "Blue bottle",
      description: "SFIT sticker",
      category: "other",
      location: "Library",
      heldWhere: "at_desk",
      heldAt: "Library",
      dateOccurred: "2026-09-15T00:00:00.000Z",
      images: [],
    });

    const restored = readPostDraft(userId);
    expect(restored?.title).toBe("Blue bottle");
    expect(restored?.heldWhere).toBe("at_desk");
    expect(restored?.itemType).toBe("found");
  });

  it("clears an empty draft instead of leaving a stub", () => {
    writePostDraft(userId, {
      itemType: "lost",
      title: "keys",
      description: "",
      category: "",
      location: "",
      heldWhere: "",
      heldAt: "",
      dateOccurred: null,
      images: [],
    });
    writePostDraft(userId, {
      itemType: "lost",
      title: "",
      description: "",
      category: "",
      location: "",
      heldWhere: "",
      heldAt: "",
      dateOccurred: null,
      images: [],
    });

    expect(readPostDraft(userId)).toBeNull();
  });

  it("can be cleared after a successful post", () => {
    writePostDraft(userId, {
      itemType: "lost",
      title: "ID card",
      description: "",
      category: "documents",
      location: "Canteen",
      heldWhere: "",
      heldAt: "",
      dateOccurred: null,
      images: [],
    });
    clearPostDraft(userId);
    expect(readPostDraft(userId)).toBeNull();
  });
});
