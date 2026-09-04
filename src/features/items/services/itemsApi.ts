import { supabase } from "@/integrations/supabase/client";
import type { ItemFilters, ItemWithImage, RawItem } from "../types";
import { rankItemsByQuery, tokenizeQuery } from "../utils/search-engine";

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
  const tokens = cleanKeyword ? tokenizeQuery(cleanKeyword) : [];

  let query = supabase
    .from("items")
    .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
    .order("created_at", { ascending: false });

  if (filters.status !== "all") {
    query = query.eq("status", filters.status as never);
  }

  if (filters.category !== "all") {
    query = query.eq("category", filters.category as never);
  }

  if (filters.location !== "all") {
    query = query.eq("location", filters.location);
  }

  if (cleanKeyword && tokens.length > 0) {
    const conditions: string[] = [];

    // Sanitize string to prevent malformed PostgREST syntax (strip commas, parens, quotes)
    const sanitizeForPostgrest = (str: string) => str.replace(/[,()"'%_\\]/g, " ").trim();

    const cleanPhrase = sanitizeForPostgrest(cleanKeyword);
    if (cleanPhrase) {
      conditions.push(`title.ilike.%${cleanPhrase}%`);
      conditions.push(`description.ilike.%${cleanPhrase}%`);
      conditions.push(`location.ilike.%${cleanPhrase}%`);
    }

    const validCategoryEnums = new Set([
      "electronics",
      "clothing",
      "documents",
      "keys",
      "wallet",
      "jewelry",
      "books",
      "other",
    ]);

    const categoryAliases: Record<string, string> = {
      book: "books",
      books: "books",
      electronic: "electronics",
      electronics: "electronics",
      laptop: "electronics",
      phone: "electronics",
      cloth: "clothing",
      clothes: "clothing",
      clothing: "clothing",
      doc: "documents",
      docs: "documents",
      document: "documents",
      documents: "documents",
      id: "documents",
      key: "keys",
      keys: "keys",
      wallet: "wallet",
      wallets: "wallet",
      purse: "wallet",
      bag: "wallet",
      jewelry: "jewelry",
      jewel: "jewelry",
      jewellery: "jewelry",
      other: "other",
    };

    tokens.slice(0, 6).forEach((tok) => {
      const cleanTok = sanitizeForPostgrest(tok);
      if (cleanTok) {
        conditions.push(`title.ilike.%${cleanTok}%`);
        conditions.push(`description.ilike.%${cleanTok}%`);
        conditions.push(`location.ilike.%${cleanTok}%`);
      }

      const matchedCat = categoryAliases[tok.toLowerCase()];
      if (matchedCat && validCategoryEnums.has(matchedCat)) {
        conditions.push(`category.eq.${matchedCat}`);
      }
    });

    if (conditions.length > 0) {
      query = query.or(conditions.join(","));
    }
  }

  let rawItems: RawItem[] = [];
  let dbQuerySucceeded = false;

  try {
    const { data, error } = await query.limit(100);
    if (!error && data) {
      rawItems = data as RawItem[];
      dbQuerySucceeded = true;
    } else if (error) {
      console.warn("Primary Supabase search query error, will use resilient fallback:", error.message);
    }
  } catch (err) {
    console.warn("Primary Supabase search query threw, will use resilient fallback:", err);
  }

  // Fallback for synonyms, typos, or searches not matched by PostgREST ilike
  if (cleanKeyword && (rawItems.length === 0 || !dbQuerySucceeded)) {
    let fallbackQuery = supabase
      .from("items")
      .select("id, title, description, category, location, status, date_occurred, created_at, user_id")
      .order("created_at", { ascending: false });

    if (filters.status !== "all") fallbackQuery = fallbackQuery.eq("status", filters.status as never);
    if (filters.category !== "all") fallbackQuery = fallbackQuery.eq("category", filters.category as never);
    if (filters.location !== "all") fallbackQuery = fallbackQuery.eq("location", filters.location);

    try {
      const { data: fallbackData, error: fallbackError } = await fallbackQuery.limit(200);
      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        rawItems = fallbackData as RawItem[];
      }
    } catch (err) {
      console.warn("Fallback query error:", err);
    }
  }

  // Hydrate with images and poster details
  let hydrated = await hydrateItems(rawItems);

  // Score and rank matched items across all visible details (title, description, color, location, poster, category)
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
  const { data: item, error: itemError } = await supabase.from("items").select("*").eq("id", id).single();

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
