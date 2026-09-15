import { z } from "zod";
import { CATEGORIES } from "@/constants";

const categoryValues = CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const postItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(100, "Title must stay within 100 characters.")
    .refine((val) => !/<script|javascript:/i.test(val), "Invalid characters detected in title."),
  description: z
    .string()
    .trim()
    .max(1000, "Description must stay within 1000 characters.")
    .refine((val) => !/<script|javascript:/i.test(val), "Invalid characters detected in description.")
    .optional()
    .or(z.literal("")),
  category: z.enum(categoryValues, {
    errorMap: () => ({ message: "Please select a valid category." }),
  }),
  location: z
    .string()
    .trim()
    .min(1, "Please select or specify a location.")
    .max(100, "Location must stay within 100 characters."),
  dateOccurred: z.date({
    required_error: "Please select when the item was lost or found.",
    invalid_type_error: "Invalid date format.",
  }),
  itemType: z.enum(["lost", "found"]),
  heldWhere: z.enum(["with_me", "at_desk"]).optional(),
  heldAt: z
    .string()
    .trim()
    .max(100, "Desk location must stay within 100 characters.")
    .optional()
    .or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.itemType !== "found") return;

  if (data.heldWhere !== "with_me" && data.heldWhere !== "at_desk") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["heldWhere"],
      message: "Say if you still have it, or if you left it at a desk.",
    });
    return;
  }

  if (data.heldWhere === "at_desk" && !data.heldAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["heldAt"],
      message: "Which desk did you leave it at?",
    });
  }
});

export type PostItemInput = z.infer<typeof postItemSchema>;

export const claimMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(15, "Please provide at least 15 characters of verifying detail.")
    .max(500, "Claim message must stay within 500 characters.")
    .refine((val) => !/<script|javascript:/i.test(val), "Invalid characters detected in message."),
});

export type ClaimMessageInput = z.infer<typeof claimMessageSchema>;
