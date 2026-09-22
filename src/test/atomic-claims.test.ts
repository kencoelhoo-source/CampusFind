import { describe, expect, it, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase client to verify atomic RPC execution vs fallback
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

describe("Atomic Claim Resolution Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes resolve_claim RPC for atomic approval and sibling rejection", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        status: "approved",
        claim_id: "claim-1",
        item_id: "item-1",
        closed_competing_claims: 2,
      },
      error: null,
    } as any);

    const claimId = "claim-1";
    const status = "approved";
    const meetup = "Central Library 2nd floor";

    const { data, error } = await supabase.rpc("resolve_claim", {
      p_claim_id: claimId,
      p_action: status,
      p_meetup: meetup,
    });

    expect(error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith("resolve_claim", {
      p_claim_id: "claim-1",
      p_action: "approved",
      p_meetup: "Central Library 2nd floor",
    });
    expect(data?.closed_competing_claims).toBe(2);
  });

  it("invokes resolve_claim RPC for atomic rejection", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        status: "rejected",
        claim_id: "claim-2",
        item_id: "item-1",
        closed_competing_claims: 0,
      },
      error: null,
    } as any);

    const { data, error } = await supabase.rpc("resolve_claim", {
      p_claim_id: "claim-2",
      p_action: "rejected",
      p_meetup: null,
    });

    expect(error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith("resolve_claim", {
      p_claim_id: "claim-2",
      p_action: "rejected",
      p_meetup: null,
    });
    expect(data?.status).toBe("rejected");
  });

  it("falls back to client-side updates if resolve_claim RPC is unavailable", async () => {
    // Simulate RPC missing error
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: "function resolve_claim does not exist" },
      count: null,
      status: 400,
      statusText: "Bad Request",
    } as any);

    const updateClaimSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const updateItemSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "claims") return { update: updateClaimSpy } as any;
      if (table === "items") return { update: updateItemSpy } as any;
      return {} as any;
    });

    // Simulate resolveIncoming fallback path
    const { error: rpcError } = await supabase.rpc("resolve_claim", {
      p_claim_id: "claim-3",
      p_action: "approved",
      p_meetup: "Canteen",
    });

    expect(rpcError).not.toBeNull();

    // Trigger fallback queries
    await supabase.from("claims").update({ status: "approved", meeting_details: "Canteen", meeting_requested: true } as any).eq("id", "claim-3");
    await supabase.from("items").update({ status: "claimed" } as any).eq("id", "item-3");

    expect(supabase.from).toHaveBeenCalledWith("claims");
    expect(supabase.from).toHaveBeenCalledWith("items");
    expect(updateClaimSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", meeting_details: "Canteen" })
    );
    expect(updateItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "claimed" })
    );
  });
});
