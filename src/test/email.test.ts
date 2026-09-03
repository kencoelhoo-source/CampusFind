import { describe, expect, it } from "vitest";
import { isAllowedSfitEmail } from "@/lib/email";

describe("SFIT email restriction", () => {
  it("allows student and staff domains", () => {
    expect(isAllowedSfitEmail("ada@student.sfit.ac.in")).toBe(true);
    expect(isAllowedSfitEmail("faculty@sfit.ac.in")).toBe(true);
    expect(isAllowedSfitEmail("  ADA@Student.SFIT.ac.in  ")).toBe(true);
  });

  it("rejects personal and lookalike domains", () => {
    expect(isAllowedSfitEmail("ada@gmail.com")).toBe(false);
    expect(isAllowedSfitEmail("ada@sfit.ac.in.com")).toBe(false);
    expect(isAllowedSfitEmail("ada@mail.student.sfit.ac.in")).toBe(false);
    expect(isAllowedSfitEmail("not-an-email")).toBe(false);
    expect(isAllowedSfitEmail(null)).toBe(false);
  });
});
