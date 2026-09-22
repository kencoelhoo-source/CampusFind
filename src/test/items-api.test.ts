import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchBrowseItems, fetchItemDetail } from "@/features/items/services/itemsApi";
import { supabase } from "@/integrations/supabase/client";

// Mock the entire supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("itemsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchBrowseItems routing logic", () => {
    it("hydrates items in a single roundtrip when RPC returns image_url and poster_name directly", async () => {
      const mockSearchData = [
        {
          id: "1",
          title: "Macbook Charger",
          user_id: "user-1",
          status: "lost",
          category: "electronics",
          relevance_score: 95.5,
          image_url: "https://example.com/mac.jpg",
          poster_name: "Ken Coelho",
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockSearchData, error: null } as any);

      const filters = {
        keyword: "  charger  ",
        status: "all",
        category: "all",
        location: "all",
        beforeScore: 85.5,
      };

      const result = await fetchBrowseItems(filters as any);

      // Verify routing: ONLY 1 call made, skipping companion queries!
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith("search_public_items", {
        search_query: "charger",
        search_type: "all",
        search_category: "all",
        p_limit: 20,
        p_before_score: 85.5,
        p_before_created_at: null,
        p_before_id: null,
      });

      // Verify returned data matches
      expect(result.length).toBe(1);
      expect(result[0].image_url).toBe("https://example.com/mac.jpg");
      expect(result[0].poster_name).toBe("Ken Coelho");
      expect(result[0].relevance_score).toBe(95.5);
    });

    it("falls back to companion RPC hydration when raw items lack metadata", async () => {
      const rawData = [
        {
          id: "2",
          title: "Keys",
          user_id: "user-2",
          status: "lost",
          category: "keys",
        },
      ];
      const imagesData = [{ item_id: "2", url: "https://example.com/keys.jpg" }];
      const profilesData = [{ user_id: "user-2", full_name: "Student X" }];

      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: rawData, error: null } as any) // search_public_items
        .mockResolvedValueOnce({ data: imagesData, error: null } as any) // list_public_item_images
        .mockResolvedValueOnce({ data: profilesData, error: null } as any); // list_public_poster_names

      const result = await fetchBrowseItems({ keyword: "keys", status: "all", category: "all", location: "all" });

      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(result[0].image_url).toBe("https://example.com/keys.jpg");
      expect(result[0].poster_name).toBe("Student X");
    });

    it("routes to browse_public_items when keyword is empty", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as any);

      const filters = {
        keyword: "",
        status: "found",
        category: "books",
        location: "all",
        beforeCreatedAt: "2026-09-01T00:00:00Z",
      };

      await fetchBrowseItems(filters as any);

      expect(supabase.rpc).toHaveBeenCalledWith("browse_public_items", {
        search_type: "found",
        search_category: "books",
        p_limit: 20,
        p_before_created_at: "2026-09-01T00:00:00Z",
        p_before_id: null,
      });
    });
  });

  describe("fetchItemDetail fault tolerance", () => {
    it("gracefully falls back to check_item_availability when get_public_item returns empty", async () => {
      // First call: get_public_item returns empty
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as any);
      // Second call: check_item_availability returns a deleted stub
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ id: "missing-1", title: "Missing Item", is_deleted: true }],
        error: null,
      } as any);

      const result = await fetchItemDetail("missing-1");

      expect(result.item).toBeNull();
      expect(result.meta).toEqual({
        id: "missing-1",
        title: "Missing Item",
        is_deleted: true,
        status: undefined,
        category: undefined,
        location: undefined,
      });
      expect(result.images).toEqual([]);
      expect(result.relatedItems).toEqual([]);
    });

    it("throws if check_item_availability fails as well", async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as any);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error("Network Error"));

      const result = await fetchItemDetail("non-existent");
      expect(result.item).toBeNull();
      expect(result.meta).toBeNull();
    });
  });
});
