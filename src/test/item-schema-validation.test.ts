import { describe, expect, it } from "vitest";
import { postItemSchema, claimMessageSchema } from "@/lib/validations/item";

describe("Zod Production Schemas", () => {
  describe("postItemSchema", () => {
    it("accepts a valid lost item payload", () => {
      const validData = {
        title: "Blue HP Laptop Bag",
        description: "Contains a charger and notebooks",
        category: "wallet",
        location: "Library",
        dateOccurred: new Date(),
        itemType: "lost",
      };

      const result = postItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts a valid found item payload without description", () => {
      const validData = {
        title: "Bunch of Keys with Honda keychain",
        category: "keys",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "with_me",
      };

      const result = postItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects titles under 3 characters", () => {
      const result = postItemSchema.safeParse({
        title: "ab",
        category: "keys",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "with_me",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at least 3 characters");
      }
    });

    it("rejects titles over 100 characters", () => {
      const result = postItemSchema.safeParse({
        title: "a".repeat(101),
        category: "keys",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "with_me",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("within 100 characters");
      }
    });

    it("blocks XSS script injection in title", () => {
      const result = postItemSchema.safeParse({
        title: "<script>alert('pwned')</script>",
        category: "keys",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "with_me",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("Invalid characters");
      }
    });

    it("blocks XSS script injection in description", () => {
      const result = postItemSchema.safeParse({
        title: "Calculus Textbook",
        description: "Look at this: javascript:stealToken()",
        category: "books",
        location: "Seminar Hall",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "with_me",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("Invalid characters");
      }
    });

    it("rejects invalid categories", () => {
      const result = postItemSchema.safeParse({
        title: "Silver Ring",
        category: "spaceships", // Invalid
        location: "Auditorium",
        dateOccurred: new Date(),
        itemType: "lost",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("valid category");
      }
    });

    it("rejects empty or whitespace-only locations", () => {
      const result = postItemSchema.safeParse({
        title: "Water Bottle",
        category: "other",
        location: "   ",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "with_me",
      });

      expect(result.success).toBe(false);
    });

    it("requires found items to say with me or left at a desk", () => {
      const result = postItemSchema.safeParse({
        title: "Black Wallet",
        category: "wallet",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
      });

      expect(result.success).toBe(false);
    });

    it("requires a desk when the item was left at a desk", () => {
      const result = postItemSchema.safeParse({
        title: "Black Wallet",
        category: "wallet",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "at_desk",
      });

      expect(result.success).toBe(false);
    });

    it("accepts a found item left at the library desk", () => {
      const result = postItemSchema.safeParse({
        title: "Black Wallet",
        category: "wallet",
        location: "Canteen",
        dateOccurred: new Date(),
        itemType: "found",
        heldWhere: "at_desk",
        heldAt: "Library",
      });

      expect(result.success).toBe(true);
    });

    it("rejects descriptions exceeding 1000 characters", () => {
      const result = postItemSchema.safeParse({
        title: "Physics Notes",
        description: "x".repeat(1001),
        category: "books",
        location: "Lab Block",
        dateOccurred: new Date(),
        itemType: "lost",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("claimMessageSchema", () => {
    it("accepts legitimate claim messages between 15 and 500 characters", () => {
      const result = claimMessageSchema.safeParse({
        message: "This is my bottle. It has an SFIT sticker on the cap and a slight dent near the bottom.",
      });

      expect(result.success).toBe(true);
    });

    it("rejects claim messages shorter than 15 characters", () => {
      const result = claimMessageSchema.safeParse({
        message: "mine give back",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at least 15 characters");
      }
    });

    it("rejects claim messages over 500 characters", () => {
      const result = claimMessageSchema.safeParse({
        message: "m".repeat(501),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("within 500 characters");
      }
    });

    it("blocks XSS payloads in claim messages", () => {
      const result = claimMessageSchema.safeParse({
        message: "I lost this item <script>document.cookie</script> please return",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("Invalid characters");
      }
    });
  });
});
