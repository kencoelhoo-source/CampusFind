import { describe, expect, it } from "vitest";

function isClaimResolved(claim: { status: string; items?: { status?: string } | null }): boolean {
  return (
    claim.status === "withdrawn" ||
    claim.status === "rejected" ||
    claim.items?.status === "returned"
  );
}

function resolveNoticeKind(meta: { is_deleted?: boolean; status?: string } | null, hasClaim: boolean): "removed" | "returned" | "claimed" | "not_found" {
  if (meta?.is_deleted || hasClaim) {
    return "removed";
  }
  if (meta?.status === "returned") {
    return "returned";
  }
  if (meta?.status === "claimed") {
    return "claimed";
  }
  return "not_found";
}

describe("claims lifecycle and resolution", () => {
  it("classifies withdrawn and rejected claims as resolved", () => {
    expect(isClaimResolved({ status: "withdrawn" })).toBe(true);
    expect(isClaimResolved({ status: "rejected" })).toBe(true);
    expect(isClaimResolved({ status: "pending" })).toBe(false);
    expect(isClaimResolved({ status: "approved", items: { status: "found" } })).toBe(false);
  });

  it("classifies approved claims whose underlying item was returned as resolved", () => {
    expect(isClaimResolved({ status: "approved", items: { status: "returned" } })).toBe(true);
  });

  it("filters out dismissed claims correctly", () => {
    const claims = [
      { id: "c1", status: "pending" },
      { id: "c2", status: "withdrawn" },
      { id: "c3", status: "approved" },
    ];
    const dismissed = ["c2"];
    const visible = claims.filter((c) => !dismissed.includes(c.id));
    expect(visible.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("determines correct resolution notice kind", () => {
    expect(resolveNoticeKind({ is_deleted: true }, false)).toBe("removed");
    expect(resolveNoticeKind(null, true)).toBe("removed");
    expect(resolveNoticeKind({ status: "returned" }, false)).toBe("returned");
    expect(resolveNoticeKind({ status: "claimed" }, false)).toBe("claimed");
    expect(resolveNoticeKind(null, false)).toBe("not_found");
  });
});
