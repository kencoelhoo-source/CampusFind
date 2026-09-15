-- Console / stolen-JWT hardening:
-- 1) Profile names are not a public student directory.
-- 2) When SFIT lock is on, non-SFIT sessions cannot write.
-- 3) Notifications cannot be forged or rewritten from the client.

CREATE OR REPLACE FUNCTION public.sfit_session_allowed()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked BOOLEAN;
  domain TEXT;
BEGIN
  SELECT sfit_email_lock INTO locked
  FROM public.app_settings
  WHERE id = 1;

  IF NOT COALESCE(locked, false) THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  SELECT lower(split_part(email, '@', 2)) INTO domain
  FROM auth.users
  WHERE id = auth.uid();

  RETURN domain IN ('student.sfit.ac.in', 'sfit.ac.in');
END;
$$;

REVOKE ALL ON FUNCTION public.sfit_session_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sfit_session_allowed() TO anon, authenticated;

-- Profiles: yourself, people with an active listing, or claimants on your listings.
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "View limited profiles" ON public.profiles;

CREATE POLICY "View limited profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.items
      WHERE items.user_id = profiles.user_id
        AND items.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.claims
      JOIN public.items ON items.id = claims.item_id
      WHERE claims.user_id = profiles.user_id
        AND items.user_id = auth.uid()
        AND items.deleted_at IS NULL
    )
  );

-- Item writes require an allowed session when the lock is on.
DROP POLICY IF EXISTS "Authenticated can create items" ON public.items;
CREATE POLICY "Authenticated can create items"
  ON public.items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.sfit_session_allowed());

DROP POLICY IF EXISTS "Users can update own items" ON public.items;
CREATE POLICY "Users can update own items"
  ON public.items
  FOR UPDATE
  TO authenticated
  USING (
    public.sfit_session_allowed()
    AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.sfit_session_allowed()
    AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can delete own items" ON public.items;
CREATE POLICY "Users can delete own items"
  ON public.items
  FOR DELETE
  TO authenticated
  USING (
    public.sfit_session_allowed()
    AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Item owners can add images" ON public.item_images;
CREATE POLICY "Item owners can add images"
  ON public.item_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.sfit_session_allowed()
    AND EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_id AND items.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Item owners can delete images" ON public.item_images;
CREATE POLICY "Item owners can delete images"
  ON public.item_images
  FOR DELETE
  TO authenticated
  USING (
    public.sfit_session_allowed()
    AND EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_id AND items.user_id = auth.uid()
    )
  );

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
    )
  );

DROP POLICY IF EXISTS "Parties can update claims" ON public.claims;
DROP POLICY IF EXISTS "Item owners and admins can update claims" ON public.claims;
CREATE POLICY "Parties can update claims"
  ON public.claims
  FOR UPDATE
  TO authenticated
  USING (
    public.sfit_session_allowed()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.items
        WHERE items.id = claims.item_id AND items.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.sfit_session_allowed()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.items
        WHERE items.id = claims.item_id AND items.user_id = auth.uid()
      )
    )
  );

-- Notifications: no client INSERTs. Updates may only flip `read`.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.notifications;

CREATE OR REPLACE FUNCTION public.enforce_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.related_item_id IS DISTINCT FROM OLD.related_item_id
     OR NEW.related_claim_id IS DISTINCT FROM OLD.related_claim_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Notifications can only be marked read.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enforce_update ON public.notifications;
CREATE TRIGGER notifications_enforce_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_notification_update();

REVOKE ALL ON FUNCTION public.enforce_notification_update() FROM PUBLIC;

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.sfit_session_allowed())
  WITH CHECK (auth.uid() = user_id AND public.sfit_session_allowed());

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.sfit_session_allowed());

-- Storage: no replacing someone else's file.
DROP POLICY IF EXISTS "Users update own item images" ON storage.objects;
CREATE POLICY "Users update own item images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'item-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.sfit_session_allowed()
  )
  WITH CHECK (
    bucket_id = 'item-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.sfit_session_allowed()
  );

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
