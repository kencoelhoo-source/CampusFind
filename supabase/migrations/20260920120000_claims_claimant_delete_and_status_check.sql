-- Allow claimants to delete/clear their own resolved claims (withdrawn, rejected, or completed/returned)
DROP POLICY IF EXISTS "Claimants can delete own resolved claims" ON public.claims;
CREATE POLICY "Claimants can delete own resolved claims"
  ON public.claims
  FOR DELETE
  TO authenticated
  USING (
    public.sfit_session_allowed()
    AND auth.uid() = user_id
    AND (
      status IN ('withdrawn', 'rejected')
      OR EXISTS (
        SELECT 1 FROM public.items
        WHERE items.id = claims.item_id
          AND (items.deleted_at IS NOT NULL OR items.status = 'returned')
      )
    )
  );

-- Function to check listing availability / resolution state even if soft-deleted
CREATE OR REPLACE FUNCTION public.check_item_availability(_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status public.item_status,
  category public.item_category,
  location TEXT,
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ
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
    i.status,
    i.category,
    i.location,
    (i.deleted_at IS NOT NULL) AS is_deleted,
    i.deleted_at
  FROM public.items i
  WHERE i.id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.check_item_availability(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_item_availability(UUID) TO anon, authenticated;
