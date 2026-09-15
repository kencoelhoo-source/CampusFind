-- Guests (signed out) must be able to read the public board.
-- Restore SELECT grants/policies that anon lost, and fix profile visibility
-- so `auth.uid()` being null does not turn the check into NULL (hidden).

GRANT SELECT ON TABLE public.items TO anon, authenticated;
GRANT SELECT ON TABLE public.item_images TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view items" ON public.items;
DROP POLICY IF EXISTS "Anyone can view active items" ON public.items;
CREATE POLICY "Anyone can view active items"
  ON public.items
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Anyone can view item images" ON public.item_images;
DROP POLICY IF EXISTS "Anyone can view active item images" ON public.item_images;
CREATE POLICY "Anyone can view active item images"
  ON public.item_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_id
        AND items.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(_profile_id = auth.uid(), false)
    OR EXISTS (
      SELECT 1 FROM public.items
      WHERE user_id = _profile_id
        AND deleted_at IS NULL
    )
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.claims
        JOIN public.items ON items.id = claims.item_id
        WHERE claims.user_id = _profile_id
          AND items.user_id = auth.uid()
          AND items.deleted_at IS NULL
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "View limited profiles" ON public.profiles;
CREATE POLICY "View limited profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (public.can_view_profile(user_id));
