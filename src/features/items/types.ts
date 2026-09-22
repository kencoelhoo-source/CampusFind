export type ItemStatus = "lost" | "found" | "claimed" | "returned";

export interface ItemWithImage {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  held_where?: string | null;
  held_at?: string | null;
  status: ItemStatus;
  date_occurred: string | null;
  created_at: string;
  image_url: string | null;
  user_id: string;
  poster_name: string | null;
  relevance_score?: number | null;
}

export interface RawItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  held_where?: string | null;
  held_at?: string | null;
  status: string;
  date_occurred: string | null;
  created_at: string;
  user_id: string;
  relevance_score?: number | null;
  image_url?: string | null;
  poster_name?: string | null;
}

export interface ItemFilters {
  keyword: string;
  status: string;
  category: string;
  location: string;
  beforeScore?: number | null;
  beforeCreatedAt?: string | null;
  beforeId?: string | null;
}
