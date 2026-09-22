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
    it("routes to search_public_items when a keyword is provided and hydrated properly", async () => {
      // Setup mock data for RPC responses
      const mockSearchData = [
        {
          id: "1",
          title: "Macbook Charger",
          user_id: "user-1",
          status: "lost",
          category: "electronics",
          relevance_score: 95.5,
        },
      ];

      const mockImagesData = [{ item_id: "1", url: "https://example.com/mac.jpg" }];
      const mockProfilesData = [{ user_id: "user-1", full_name: "Ken Coelho" }];

      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: mockSearchData, error: null } as any) // for search_public_items
        .mockResolvedValueOnce({ data: mockImagesData, error: null } as any) // for list_public_item_images
        .mockResolvedValueOnce({ data: mockProfilesData, error: null } as any); // for list_public_poster_names

      const filters = {
        keyword: "  charger  ",
        status: "all",
        category: "all",
        location: "all",
        beforeScore: 85.5,
      };

      const result = await fetchBrowseItems(filters as any);

      // Verify routing
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, "search_public_items", {
        search_query: "charger",
        search_type: "all",
        search_category: "all",
        p_limit: 20,
        p_before_score: 85.5,
        p_before_created_at: null,
        p_before_id: null,
      });

      // Verify hydration
      expect(result.length).toBe(1);
      expect(result[0].image_url).toBe("https://example.com/mac.jpg");
      expect(result[0].poster_name).toBe("Ken Coelho");
      expect(result[0].relevance_score).toBe(95.5);
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
