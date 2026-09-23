-- Launch hardening: claims cannot self-approve, notifications cannot spam,
-- uploads stay in the caller's folder, emails match exactly, contact_email is hidden.

-- ---------------------------------------------------------------------------
-- Schema that the app already uses but was missing from earlier migrations
-- ---------------------------------------------------------------------------

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS verification_question TEXT,
  ADD COLUMN IF NOT EXISTS verification_answer TEXT,
  ADD COLUMN IF NOT EXISTS meeting_requested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meeting_details TEXT,
  ADD COLUMN IF NOT EXISTS appeal_message TEXT;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_sender_created_idx
  ON public.notifications (sender_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Never expose or store listing emails
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'items' 
      AND column_name = 'contact_email'
  ) THEN
    UPDATE public.items SET contact_email = NULL WHERE contact_email IS NOT NULL;
    REVOKE SELECT (contact_email) ON TABLE public.items FROM PUBLIC, anon, authenticated;
    REVOKE INSERT (contact_email) ON TABLE public.items FROM PUBLIC, anon, authenticated;
    REVOKE UPDATE (contact_email) ON TABLE public.items FROM PUBLIC, anon, authenticated;

    CREATE OR REPLACE FUNCTION public.strip_item_contact_email()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      NEW.contact_email = NULL;
      RETURN NEW;
    END;
    $func$;

    DROP TRIGGER IF EXISTS items_strip_contact_email ON public.items;
    CREATE TRIGGER items_strip_contact_email
      BEFORE INSERT OR UPDATE ON public.items
      FOR EACH ROW EXECUTE FUNCTION public.strip_item_contact_email();

    REVOKE EXECUTE ON FUNCTION public.strip_item_contact_email() FROM PUBLIC;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Exact SFIT email domains (no LIKE, no NULL)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_signup_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain TEXT;
BEGIN
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;

  IF length(NEW.email) - length(replace(NEW.email, '@', '')) <> 1 THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;

  domain := lower(split_part(btrim(NEW.email), '@', 2));

  IF domain NOT IN ('student.sfit.ac.in', 'sfit.ac.in') THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Claims: pending only, not your own item, only lost/found, message length
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_claim_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.meeting_details := NULL;
  NEW.meeting_requested := false;
  NEW.verification_question := NULL;
  NEW.verification_answer := NULL;
  NEW.appeal_message := NULL;

  IF length(btrim(NEW.message)) < 15 THEN
    RAISE EXCEPTION 'Add a bit more detail — color, marks, or what’s inside.';
  END IF;

  IF length(NEW.message) > 500 THEN
    RAISE EXCEPTION 'Claim details must stay within 500 characters.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.items
    WHERE id = NEW.item_id
      AND user_id <> NEW.user_id
      AND status IN ('lost', 'found')
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This item cannot be claimed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claims_enforce_insert ON public.claims;
CREATE TRIGGER claims_enforce_insert
  BEFORE INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.enforce_claim_insert();

REVOKE EXECUTE ON FUNCTION public.enforce_claim_insert() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.enforce_claim_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_owner UUID;
BEGIN
  SELECT user_id INTO item_owner
  FROM public.items
  WHERE id = NEW.item_id;

  IF auth.uid() IS DISTINCT FROM item_owner
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed to update this claim.';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.message IS DISTINCT FROM OLD.message THEN
    RAISE EXCEPTION 'Claim identity and message cannot be changed.';
  END IF;

  IF OLD.status IN ('approved', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'This claim is already resolved.';
  END IF;

  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid claim status.';
  END IF;

  IF NEW.meeting_details IS NOT NULL AND length(NEW.meeting_details) > 500 THEN
    RAISE EXCEPTION 'Meeting details must stay within 500 characters.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claims_enforce_update ON public.claims;
CREATE TRIGGER claims_enforce_update
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.enforce_claim_update();

REVOKE EXECUTE ON FUNCTION public.enforce_claim_update() FROM PUBLIC;

DROP POLICY IF EXISTS "Authenticated can create claims" ON public.claims;
DROP POLICY IF EXISTS "Authenticated can create pending claims" ON public.claims;

CREATE POLICY "Authenticated can create pending claims"
  ON public.claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.items
      WHERE id = item_id
        AND user_id <> auth.uid()
        AND status IN ('lost', 'found')
        AND deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications: only owner <-> claimant on a real item, rate-limited
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _related_item_id UUID DEFAULT NULL,
  _related_claim_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
  item_owner UUID;
  send_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _user_id IS NULL OR _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid notification recipient';
  END IF;

  IF _related_item_id IS NULL THEN
    RAISE EXCEPTION 'A related item is required';
  END IF;

  IF length(btrim(coalesce(_title, ''))) = 0 OR length(_title) > 200 THEN
    RAISE EXCEPTION 'Invalid notification title';
  END IF;

  IF length(btrim(coalesce(_message, ''))) = 0 OR length(_message) > 1000 THEN
    RAISE EXCEPTION 'Invalid notification message';
  END IF;

  SELECT user_id INTO item_owner
  FROM public.items
  WHERE id = _related_item_id
    AND deleted_at IS NULL;

  IF item_owner IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF _related_claim_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.claims
    WHERE id = _related_claim_id
      AND item_id = _related_item_id
  ) THEN
    RAISE EXCEPTION 'Claim does not match this item';
  END IF;

  IF auth.uid() = item_owner THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.claims
      WHERE item_id = _related_item_id
        AND user_id = _user_id
    ) THEN
      RAISE EXCEPTION 'Not allowed to notify this user';
    END IF;
  ELSIF _user_id = item_owner THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.claims
      WHERE item_id = _related_item_id
        AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Not allowed to notify this user';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not allowed to notify this user';
  END IF;

  SELECT COUNT(*) INTO send_count
  FROM public.notifications
  WHERE sender_id = auth.uid()
    AND created_at > now() - INTERVAL '1 hour';

  IF send_count >= 20 THEN
    RAISE EXCEPTION 'Notification rate limit reached. Try again later.';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    sender_id,
    title,
    message,
    related_item_id,
    related_claim_id
  )
  VALUES (
    _user_id,
    auth.uid(),
    btrim(_title),
    btrim(_message),
    _related_item_id,
    _related_claim_id
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: own folder only, jpeg/png/webp, 5 MB
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'item-images';

DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload item images to own folder" ON storage.objects;

CREATE POLICY "Users upload item images to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can view item images storage" ON storage.objects;
DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;

CREATE POLICY "Public can view item images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'item-images');
