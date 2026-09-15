-- Found items left at a desk are collected there. No 1:1 claim with the poster.

DROP POLICY IF EXISTS "Authenticated can create pending claims" ON public.claims;
CREATE POLICY "Authenticated can create pending claims"
  ON public.claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.sfit_session_allowed()
    AND auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.items
      WHERE id = item_id
        AND user_id <> auth.uid()
        AND status IN ('lost', 'found')
        AND deleted_at IS NULL
        AND (held_where IS DISTINCT FROM 'at_desk')
    )
  );
