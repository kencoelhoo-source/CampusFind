import { supabase } from "@/integrations/supabase/client";
import type { ItemFilters, ItemWithImage, RawItem } from "../types";
import { rankItemsByQuery } from "../utils/search-engine";

export async function hydrateItems(items: RawItem[]): Promise<ItemWithImage[]> {
  if (items.length === 0) {
    return [];
  }

  const itemIds = items.map((item) => item.id);
  const userIds = Array.from(new Set(items.map((item) => item.user_id)));

  const [{ data: images, error: imagesError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("item_images").select("item_id, url").in("item_id", itemIds),
    supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
  ]);

  if (imagesError) {
    throw imagesError;
  }

  if (profilesError) {
    throw profilesError;
  }

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
  const { data, error } = await supabase
    .from("items")
    .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return hydrateItems((data || []) as RawItem[]);
}

export async function fetchBrowseItems(filters: ItemFilters) {
  const cleanKeyword = filters.keyword.trim();

  let query = supabase
    .from("items")
    .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status as never);
  }

  if (filters.category !== "all") {
    query = query.eq("category", filters.category as never);
  }

  if (filters.location !== "all") {
    query = query.eq("location", filters.location);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  let hydrated = await hydrateItems((data || []) as RawItem[]);

  if (cleanKeyword && hydrated.length > 0) {
    hydrated = rankItemsByQuery(hydrated, cleanKeyword);
  }

  return hydrated;
}

export async function fetchHomeStats() {
  const { data, error } = await supabase.from("items").select("status");

  if (error) {
    throw error;
  }

  const rows = data || [];

  return {
    total: rows.length,
    lost: rows.filter((item) => item.status === "lost").length,
    found: rows.filter((item) => item.status === "found").length,
  };
}

export async function fetchItemDetail(id: string) {
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
    .eq("id", id)
    .single();

  if (itemError) {
    throw itemError;
  }

  const [imagesRes, profileRes, relatedRes] = await Promise.all([
    supabase.from("item_images").select("url").eq("item_id", id),
    supabase.from("profiles").select("full_name").eq("user_id", item.user_id).maybeSingle(),
    supabase
      .from("items")
      .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
      .eq("category", item.category)
      .neq("id", id)
      .limit(4),
  ]);

  if (imagesRes.error) {
    throw imagesRes.error;
  }

  if (profileRes.error) {
    throw profileRes.error;
  }

  if (relatedRes.error) {
    throw relatedRes.error;
  }

  return {
    item,
    images: imagesRes.data?.map((image) => image.url) || [],
    poster: profileRes.data?.full_name || "Anonymous",
    relatedItems: await hydrateItems((relatedRes.data || []) as RawItem[]),
  };
}
