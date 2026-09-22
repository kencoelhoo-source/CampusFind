import { supabase } from "@/integrations/supabase/client";
import type { ItemFilters, ItemWithImage, RawItem } from "../types";
import { rankItemsByQuery } from "../utils/search-engine";

async function hydratePublicItems(items: RawItem[]): Promise<ItemWithImage[]> {
  if (items.length === 0) return [];

  // Single-Roundtrip Fast Path:
  // If the database RPC already populated poster_name and image_url, return immediately in memory!
  const allPopulated = items.every(
    (item) => item.poster_name !== undefined && item.image_url !== undefined
  );

  if (allPopulated) {
    return items.map((item) => ({
      ...item,
      status: item.status as ItemWithImage["status"],
      image_url: item.image_url ?? null,
      poster_name: item.poster_name ?? null,
      relevance_score: item.relevance_score ?? null,
    }));
  }

  // Fallback path: Only used when querying raw tables directly or legacy RPCs
  const itemIds = items.map((item) => item.id);
  const userIds = Array.from(new Set(items.map((item) => item.user_id)));

  const [{ data: images }, { data: profiles }] = await Promise.all([
    supabase.rpc("list_public_item_images", { _ids: itemIds }),
    supabase.rpc("list_public_poster_names", { _ids: userIds }),
  ]);

  const imageMap = new Map<string, string>();
  images?.forEach((image) => {
    if (!imageMap.has(image.item_id)) {
      imageMap.set(image.item_id, image.url);
    }
  });

  const profileMap = new Map<string, string | null>();
  profiles?.forEach((profile) => {
    profileMap.set(profile.user_id, profile.full_name);
  });

  return items.map((item) => ({
    ...item,
    status: item.status as ItemWithImage["status"],
    image_url: item.image_url ?? imageMap.get(item.id) ?? null,
    poster_name: item.poster_name ?? profileMap.get(item.user_id) ?? null,
    relevance_score: item.relevance_score ?? null,
  }));
}

export async function fetchRecentItems(limit = 8) {
  const { data, error } = await supabase.rpc("get_recent_public_items", { p_limit: limit });
  if (error) throw error;

  return hydratePublicItems(data as RawItem[]);
}

export async function fetchBrowseItems(filters: ItemFilters) {
  if (filters.keyword && filters.keyword.trim().length > 0) {
    try {
      const { data, error } = await supabase.rpc("search_public_items", {
        search_query: filters.keyword.trim(),
        search_type: filters.status === "all" ? 'all' : filters.status,
        search_category: filters.category === "all" ? 'all' : filters.category,
        p_limit: 20,
        p_before_score: filters.beforeScore || null,
        p_before_created_at: filters.beforeCreatedAt || null,
        p_before_id: filters.beforeId || null,
      });
      if (error) throw error;
      return hydratePublicItems((data || []) as RawItem[]);
    } catch (rpcErr) {
      console.warn("search_public_items RPC failed or unavailable, falling back to resilient client-side search:", rpcErr);
      const query = supabase
        .from("items")
        .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
        .is("deleted_at", null);

      if (filters.status !== "all") query.eq("status", filters.status as any);
      if (filters.category !== "all") query.eq("category", filters.category as any);

      const { data: fallbackData, error: fallbackErr } = await query;
      if (fallbackErr) throw fallbackErr;

      const hydrated = await hydratePublicItems((fallbackData || []) as RawItem[]);
      return rankItemsByQuery(hydrated, filters.keyword.trim());
    }
  } else {
    try {
      const { data, error } = await supabase.rpc("browse_public_items", {
        search_type: filters.status === "all" ? 'all' : filters.status,
        search_category: filters.category === "all" ? 'all' : filters.category,
        p_limit: 20,
        p_before_created_at: filters.beforeCreatedAt || null,
        p_before_id: filters.beforeId || null,
      });
      if (error) throw error;
      return hydratePublicItems((data || []) as RawItem[]);
    } catch (rpcErr) {
      console.warn("browse_public_items RPC failed or unavailable, falling back to direct table query:", rpcErr);
      const query = supabase
        .from("items")
        .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (filters.status !== "all") query.eq("status", filters.status as any);
      if (filters.category !== "all") query.eq("category", filters.category as any);

      const { data: fallbackData, error: fallbackErr } = await query;
      if (fallbackErr) throw fallbackErr;

      return hydratePublicItems((fallbackData || []) as RawItem[]);
    }
  }
}

export async function fetchHomeStats() {
  const { data, error } = await supabase.rpc("get_home_stats");
  if (error) throw error;

  const row = (data || [])[0];
  if (!row) {
    return { totalActive: 0, totalResolved: 0, recentActivity: 0 };
  }

  return {
    totalActive: Number(row.total_active),
    totalResolved: Number(row.total_resolved),
    recentActivity: Number(row.recent_activity),
  };
}

export async function fetchItemDetail(id: string) {
  const { data, error } = await supabase.rpc("get_public_item", { _id: id });
  if (error) throw error;

  const item = (data || [])[0] as RawItem | undefined;
  if (!item) {
    try {
      const { data: avail } = await supabase.rpc("check_item_availability", { _id: id });
      const row = (avail || [])[0];
      if (row) {
        return {
          item: null,
          meta: {
            id: row.id,
            title: row.title,
            status: row.status,
            category: row.category,
            location: row.location,
            is_deleted: Boolean(row.is_deleted),
          },
          images: [],
          poster: "Campus Member",
          relatedItems: [],
        };
      }
    } catch {
      // ignore
    }

    return {
      item: null,
      meta: null,
      images: [],
      poster: "Campus Member",
      relatedItems: [],
    };
  }

  const [imagesRes, namesRes, relatedRes] = await Promise.all([
    supabase.rpc("list_public_item_images", { _ids: [id] }),
    supabase.rpc("list_public_poster_names", { _ids: [item.user_id] }),
    supabase.rpc("get_related_public_items", { p_category: item.category as any, p_status: item.status, p_item_id: id, p_limit: 4 }),
  ]);

  const related = (relatedRes.data || []) as RawItem[];

  return {
    item,
    meta: {
      id: item.id,
      title: item.title,
      status: item.status,
      category: item.category,
      location: item.location,
      is_deleted: false,
    },
    images: imagesRes.data?.map((image) => image.url) || [],
    poster: namesRes.data?.[0]?.full_name || "Anonymous",
    relatedItems: await hydratePublicItems(related),
  };
}
