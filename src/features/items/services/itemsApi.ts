import { supabase } from "@/integrations/supabase/client";
import type { ItemFilters, ItemWithImage, RawItem } from "../types";
import { rankItemsByQuery } from "../utils/search-engine";

async function hydratePublicItems(items: RawItem[]): Promise<ItemWithImage[]> {
  if (items.length === 0) return [];

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
    image_url: imageMap.get(item.id) || null,
    poster_name: profileMap.get(item.user_id) || null,
  }));
}

export async function fetchRecentItems(limit = 8) {
  const { data, error } = await supabase.rpc("list_public_items");
  if (error) throw error;

  const rows = ((data || []) as RawItem[])
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit);

  return hydratePublicItems(rows);
}

export async function fetchBrowseItems(filters: ItemFilters) {
  const { data, error } = await supabase.rpc("list_public_items");
  if (error) throw error;

  let rows = (data || []) as RawItem[];

  if (filters.status !== "all") {
    rows = rows.filter((item) => item.status === filters.status);
  }
  if (filters.category !== "all") {
    rows = rows.filter((item) => item.category === filters.category);
  }
  if (filters.location !== "all") {
    rows = rows.filter((item) => item.location === filters.location || item.held_at === filters.location);
  }

  rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  rows = rows.slice(0, 100);

  let hydrated = await hydratePublicItems(rows);
  const cleanKeyword = filters.keyword.trim();
  if (cleanKeyword && hydrated.length > 0) {
    hydrated = rankItemsByQuery(hydrated, cleanKeyword);
  }
  return hydrated;
}

export async function fetchHomeStats() {
  const { data, error } = await supabase.rpc("list_public_items");
  if (error) throw error;

  const rows = data || [];
  const lost = rows.filter((item) => item.status === "lost").length;
  const found = rows.filter((item) => item.status === "found").length;

  return {
    total: lost + found,
    lost,
    found,
  };
}

export async function fetchItemDetail(id: string) {
  const { data, error } = await supabase.rpc("get_public_item", { _id: id });
  if (error) throw error;

  const item = (data || [])[0] as RawItem | undefined;
  if (!item) {
    throw new Error("Item not found.");
  }

  const [imagesRes, namesRes, relatedRes] = await Promise.all([
    supabase.rpc("list_public_item_images", { _ids: [id] }),
    supabase.rpc("list_public_poster_names", { _ids: [item.user_id] }),
    supabase.rpc("list_public_items"),
  ]);

  const related = ((relatedRes.data || []) as RawItem[])
    .filter((row) => row.id !== id && row.category === item.category)
    .slice(0, 4);

  return {
    item,
    images: imagesRes.data?.map((image) => image.url) || [],
    poster: namesRes.data?.[0]?.full_name || "Anonymous",
    relatedItems: await hydratePublicItems(related),
  };
}
