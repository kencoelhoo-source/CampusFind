import { describe, expect, it, vi } from "vitest";
import { isAllowedSfitEmail } from "@/lib/email";
import { rejectNonSfitSession } from "@/contexts/AuthContext";
import type { Session } from "@supabase/supabase-js";

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
    expect(isAllowedSfitEmail("foo@bar@student.sfit.ac.in")).toBe(false);
  });

  it("rejectNonSfitSession permits valid SFIT sessions", () => {
    const session = { user: { email: "student@student.sfit.ac.in" } } as unknown as Session;
    const tracker = { current: null };
    const onReject = vi.fn();

    const result = rejectNonSfitSession(session, tracker, onReject);
    expect(result).toBe(session);
    expect(tracker.current).toBeNull();
    expect(onReject).not.toHaveBeenCalled();
  });

  it("rejectNonSfitSession blocks and flags unauthorized sessions", () => {
    const session = { user: { email: "intruder@gmail.com" } } as unknown as Session;
    const tracker = { current: null };
    const onReject = vi.fn();

    const result = rejectNonSfitSession(session, tracker, onReject);
    expect(result).toBeNull();
    expect(tracker.current).toBe("intruder@gmail.com");
    expect(onReject).toHaveBeenCalledWith("intruder@gmail.com");
  });
});
