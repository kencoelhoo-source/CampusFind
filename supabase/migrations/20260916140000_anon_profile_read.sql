-- Signed-out browse was failing: profile RLS joined claims, which called has_role,
-- and anon is not allowed to execute has_role.

CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _profile_id = auth.uid()
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
