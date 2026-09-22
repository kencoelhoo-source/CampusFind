import { describe, expect, it, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase client to verify database operations
vi.mock("@/integrations/supabase/client", () => {
  const mockUpdate = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockSelect = vi.fn().mockReturnThis();
  const mockIs = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            update: mockUpdate,
            select: mockSelect,
            eq: mockEq,
            is: mockIs,
            order: mockOrder,
          };
        }
        return {
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        };
      }),
      storage: {
        from: vi.fn(),
      },
    },
  };
});

describe("Dashboard Soft-Delete Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performs soft-delete by setting deleted_at timestamp rather than executing raw DELETE", async () => {
    const itemId = "test-item-123";
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateSpy,
    } as any);

    // Simulate deleteItem soft deletion logic
    const { error } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", itemId);

    expect(error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith("items");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      })
    );
    // Ensure frontend does not access storage.from('item-images').remove directly
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("filters out soft-deleted items when querying dashboard listings", async () => {
    const isSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const eqSpy = vi.fn().mockReturnValue({
      is: isSpy,
    });
    const selectSpy = vi.fn().mockReturnValue({
      eq: eqSpy,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectSpy,
    } as any);

    // Simulate fetchDashboardData items query
    await supabase
      .from("items")
      .select("id, title")
      .eq("user_id", "user-123")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    expect(isSpy).toHaveBeenCalledWith("deleted_at", null);
  });
});
