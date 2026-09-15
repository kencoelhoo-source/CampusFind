-- Guest board is empty because anon has no working SELECT policy on items.
-- Recreate guest read from scratch. Does not open claims, alerts, or emails.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.items TO anon, authenticated;
GRANT SELECT ON TABLE public.item_images TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'items'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.items', r.policyname);
  END LOOP;

  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'item_images'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.item_images', r.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Anyone can view active items"
  ON public.items
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

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

DROP POLICY IF EXISTS "View limited profiles" ON public.profiles;
CREATE POLICY "View limited profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (public.can_view_profile(user_id));

NOTIFY pgrst, 'reload schema';
