-- list_public_items was returning [] for guests because RLS still applied
-- inside SECURITY DEFINER. Disable row_security for this read only.

CREATE OR REPLACE FUNCTION public.list_public_items()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category public.item_category,
  location TEXT,
  held_where TEXT,
  held_at TEXT,
  status public.item_status,
  date_occurred DATE,
  created_at TIMESTAMPTZ,
  user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.description,
    i.category,
    i.location,
    i.held_where,
    i.held_at,
    i.status,
    i.date_occurred,
    i.created_at,
    i.user_id
  FROM public.items i
  WHERE i.deleted_at IS NULL
    AND i.status IN ('lost', 'found', 'claimed');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_item(_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category public.item_category,
  location TEXT,
  held_where TEXT,
  held_at TEXT,
  status public.item_status,
  date_occurred DATE,
  created_at TIMESTAMPTZ,
  user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.description,
    i.category,
    i.location,
    i.held_where,
    i.held_at,
    i.status,
    i.date_occurred,
    i.created_at,
    i.user_id
  FROM public.items i
  WHERE i.id = _id
    AND i.deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_item_images(_ids UUID[])
RETURNS TABLE (item_id UUID, url TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT img.item_id, img.url
  FROM public.item_images img
  JOIN public.items i ON i.id = img.item_id
  WHERE img.item_id = ANY (_ids)
    AND i.deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_poster_names(_ids UUID[])
RETURNS TABLE (user_id UUID, full_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.user_id = ANY (_ids)
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.user_id = p.user_id
        AND i.deleted_at IS NULL
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_items() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_item(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_item_images(UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_poster_names(UUID[]) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
