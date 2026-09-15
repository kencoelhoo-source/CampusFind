import { describe, expect, it, vi } from "vitest";
import { canManageSfitEmailLock, getEmailLockCache, isAllowedSfitEmail, isSfitEmailDomain, setEmailLockCache } from "@/lib/email";
import { rejectNonSfitSession } from "@/contexts/AuthContext";
import type { Session } from "@supabase/supabase-js";

describe("SFIT email restriction", () => {
  it("allows student and staff domains", () => {
    expect(isSfitEmailDomain("ada@student.sfit.ac.in")).toBe(true);
    expect(isSfitEmailDomain("faculty@sfit.ac.in")).toBe(true);
    expect(isSfitEmailDomain("  ADA@Student.SFIT.ac.in  ")).toBe(true);
  });

  it("rejects personal and lookalike domains", () => {
    expect(isSfitEmailDomain("ada@gmail.com")).toBe(false);
    expect(isSfitEmailDomain("ada@sfit.ac.in.com")).toBe(false);
    expect(isSfitEmailDomain("ada@mail.student.sfit.ac.in")).toBe(false);
    expect(isSfitEmailDomain("not-an-email")).toBe(false);
    expect(isSfitEmailDomain(null)).toBe(false);
    expect(isSfitEmailDomain("foo@bar@student.sfit.ac.in")).toBe(false);
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
    setEmailLockCache(true);
    const session = { user: { email: "intruder@gmail.com" } } as unknown as Session;
    const tracker = { current: null };
    const onReject = vi.fn();

    const result = rejectNonSfitSession(session, tracker, onReject);
    expect(result).toBeNull();
    expect(tracker.current).toBe("intruder@gmail.com");
    expect(onReject).toHaveBeenCalledWith("intruder@gmail.com");
  });

  it("only Ken's student account can manage the lock", () => {
    expect(canManageSfitEmailLock("kencoelhoo@student.sfit.ac.in")).toBe(true);
    expect(canManageSfitEmailLock("someone@student.sfit.ac.in")).toBe(false);
    expect(canManageSfitEmailLock("intruder@gmail.com")).toBe(false);
  });

  it("isAllowedSfitEmail follows the runtime lock", () => {
    setEmailLockCache(true);
    expect(isAllowedSfitEmail("ada@student.sfit.ac.in")).toBe(true);
    expect(isAllowedSfitEmail("intruder@gmail.com")).toBe(false);
    setEmailLockCache(false);
    expect(getEmailLockCache()).toBe(false);
    expect(isAllowedSfitEmail("intruder@gmail.com")).toBe(true);
  });
});
