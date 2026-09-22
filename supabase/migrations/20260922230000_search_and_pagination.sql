-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add generated full-text search column
ALTER TABLE public.items
ADD COLUMN fts tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple'::regconfig, coalesce(location, '')), 'B') ||
  setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
) STORED;

-- Create GIN index for full-text search
CREATE INDEX items_fts_idx ON public.items USING GIN (fts);

-- Create GIN pg_trgm indexes for fuzzy matching
CREATE INDEX items_title_trgm_idx ON public.items USING GIN (title gin_trgm_ops);
CREATE INDEX items_description_trgm_idx ON public.items USING GIN (description gin_trgm_ops);
CREATE INDEX items_location_trgm_idx ON public.items USING GIN (location gin_trgm_ops);

-- Define the return type for search results (to allow consistent return sets)
DROP TYPE IF EXISTS public.search_result_item CASCADE;
CREATE TYPE public.search_result_item AS (
    id uuid,
    created_at timestamptz,
    user_id uuid,
    title text,
    description text,
    category public.item_category,
    location text,
    status public.item_status,
    date_occurred date,
    image_url text,
    image_count int,
    relevance_score float4
);

-- Search RPC: relevance ranked
CREATE OR REPLACE FUNCTION public.search_public_items(
  search_query text,
  search_type text DEFAULT 'all',
  search_category text DEFAULT 'all',
  p_limit int DEFAULT 20,
  p_before_score float4 DEFAULT NULL,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS SETOF public.search_result_item
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fts_query tsquery;
BEGIN
  -- Parse query into tsquery for exact/prefix matches
  fts_query := plainto_tsquery('simple', search_query);

  RETURN QUERY
  WITH candidates AS (
    SELECT i.id, i.created_at, i.user_id, i.title, i.description, i.category, i.location, i.status, i.date_occurred,
           (ts_rank(i.fts, fts_query)) AS fts_score,
           (similarity(i.title, search_query) + similarity(coalesce(i.description, ''), search_query)) AS fuzzy_score
    FROM public.items i
  WHERE i.deleted_at IS NULL
      AND (search_type = 'all' OR i.status::text = search_type)
      AND (search_category = 'all' OR i.category::text = search_category)
      AND (
        (fts_query @@ i.fts) -- FTS match
        OR
        (i.title % search_query OR coalesce(i.description, '') % search_query) -- Trigram match
      )
  ),
  scored AS (
    SELECT c.*,
           (c.fts_score + c.fuzzy_score) AS relevance_score
    FROM candidates c
  ),
  filtered AS (
    SELECT s.*
    FROM scored s
    WHERE
      (p_before_score IS NULL OR s.relevance_score < p_before_score OR (s.relevance_score = p_before_score AND s.created_at < p_before_created_at) OR (s.relevance_score = p_before_score AND s.created_at = p_before_created_at AND s.id < p_before_id))
  )
  SELECT
    f.id, f.created_at, f.user_id, f.title, f.description, f.category, f.location, f.status, f.date_occurred,
    (SELECT url FROM public.item_images img WHERE img.item_id = f.id ORDER BY created_at ASC LIMIT 1) as image_url,
    (SELECT count(*)::int FROM public.item_images img WHERE img.item_id = f.id) as image_count,
    f.relevance_score::float4
  FROM filtered f
  ORDER BY f.relevance_score DESC, f.created_at DESC, f.id DESC
  LIMIT p_limit;
END;
$$;

-- Browse RPC: chronologically ordered keyset pagination
CREATE OR REPLACE FUNCTION public.browse_public_items(
  search_type text DEFAULT 'all',
  search_category text DEFAULT 'all',
  p_limit int DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS SETOF public.search_result_item
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.created_at, i.user_id, i.title, i.description, i.category, i.location, i.status, i.date_occurred,
    (SELECT url FROM public.item_images img WHERE img.item_id = i.id ORDER BY created_at ASC LIMIT 1) as image_url,
    (SELECT count(*)::int FROM public.item_images img WHERE img.item_id = i.id) as image_count,
    0.0::float4 as relevance_score
  FROM public.items i
  WHERE i.deleted_at IS NULL
    AND (search_type = 'all' OR i.status::text = search_type)
    AND (search_category = 'all' OR i.category::text = search_category)
    AND (
      p_before_created_at IS NULL OR i.created_at < p_before_created_at OR (i.created_at = p_before_created_at AND i.id < p_before_id)
    )
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT p_limit;
$$;

-- Get recent public items
CREATE OR REPLACE FUNCTION public.get_recent_public_items(
  p_limit int DEFAULT 5
)
RETURNS SETOF public.search_result_item
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.created_at, i.user_id, i.title, i.description, i.category, i.location, i.status, i.date_occurred,
    (SELECT url FROM public.item_images img WHERE img.item_id = i.id ORDER BY created_at ASC LIMIT 1) as image_url,
    (SELECT count(*)::int FROM public.item_images img WHERE img.item_id = i.id) as image_count,
    0.0::float4 as relevance_score
  FROM public.items i
  WHERE i.deleted_at IS NULL
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT p_limit;
$$;

-- Get home stats
CREATE OR REPLACE FUNCTION public.get_home_stats()
RETURNS TABLE (
  total_active bigint,
  total_resolved bigint,
  recent_activity bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.items WHERE deleted_at IS NULL AND (status = 'lost' OR status = 'found')) as total_active,
    (SELECT count(*) FROM public.items WHERE deleted_at IS NULL AND (status = 'returned' OR status = 'claimed')) as total_resolved,
    (SELECT count(*) FROM public.items WHERE deleted_at IS NULL AND created_at > now() - interval '7 days') as recent_activity;
$$;

-- Get related public items
CREATE OR REPLACE FUNCTION public.get_related_public_items(
  p_item_id uuid,
  p_category text,
  p_status text,
  p_limit int DEFAULT 4
)
RETURNS SETOF public.search_result_item
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.created_at, i.user_id, i.title, i.description, i.category, i.location, i.status, i.date_occurred,
    (SELECT url FROM public.item_images img WHERE img.item_id = i.id ORDER BY created_at ASC LIMIT 1) as image_url,
    (SELECT count(*)::int FROM public.item_images img WHERE img.item_id = i.id) as image_count,
    0.0::float4 as relevance_score
  FROM public.items i
  WHERE i.id != p_item_id
    AND i.deleted_at IS NULL
    AND i.category::text = p_category
    AND i.status::text = p_status
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT p_limit;
$$;
