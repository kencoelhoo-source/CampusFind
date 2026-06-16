import { describe, expect, it } from "vitest";
import { dedupeFiles, MAX_ITEM_IMAGES, validateClaimMessage, validateItemImage } from "@/lib/item-validation";

describe("item validation", () => {
  it("deduplicates file selections by stable file metadata", () => {
    const files = [
      { name: "phone.jpg", size: 100, lastModified: 1 },
      { name: "phone.jpg", size: 100, lastModified: 1 },
      { name: "wallet.png", size: 200, lastModified: 2 },
    ];

    expect(dedupeFiles(files)).toEqual([
      { name: "phone.jpg", size: 100, lastModified: 1 },
      { name: "wallet.png", size: 200, lastModified: 2 },
    ]);
  });

  it("accepts supported image files inside the size limit", () => {
    expect(validateItemImage({ name: "item.webp", size: 1024, type: "image/webp" } as File)).toBeNull();
  });

  it("rejects unsupported image types", () => {
    expect(validateItemImage({ name: "item.gif", size: 1024, type: "image/gif" } as File)).toContain("must be a JPG, PNG, or WebP image");
  });

  it("rejects oversized images", () => {
    expect(validateItemImage({ name: "item.jpg", size: 6 * 1024 * 1024, type: "image/jpeg" } as File)).toContain("exceeds the 5 MB limit");
  });

  it("enforces a minimum claim message length", () => {
    expect(validateClaimMessage("too short")).toContain("at least 15 characters");
    expect(validateClaimMessage("This claim message is detailed enough.")).toBeNull();
  });

  it("keeps the configured image cap stable", () => {
    expect(MAX_ITEM_IMAGES).toBe(5);
  });
});
