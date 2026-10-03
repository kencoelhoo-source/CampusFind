-- ==============================================================================
-- CampusFind Migration: Close backend loopholes found in the October 2026 audit
--
-- 1. Items: created_at is server-set. A client could insert created_at = '2000-01-01'
--    to skip the 5-posts-per-hour limit, or a future date to pin a post to the top.
--    Also: new listings must be lost/found, owners can't be reassigned, deleted
--    listings can't be resurrected after their photos are queued for purge, and
--    text fields get the same limits the post form already enforces.
-- 2. item_images: storage_path must live in the caller's own listing folder.
--    Before this, a user could point storage_path at someone else's photo, delete
--    their own listing, and the purge job would erase the other user's file.
-- 3. Storage: stop anonymous listing of every file in the public bucket.
--    Public URLs (/object/public/...) keep working because the bucket is public.
-- 4. Storage quota: photos already queued for purge no longer count against it,
--    so "delete old posts to free up storage" actually works.
-- 5. resolve_claim: the claims AFTER UPDATE trigger already notifies people, so
--    the RPC's own inserts produced duplicate "Claim accepted/declined" alerts.
-- 6. Claims can only be hard-deleted by admins. Claimant deletes let a declined
--    claimant delete and re-claim (dodging the decline and the 15/day limit,
--    which only counts surviving rows). The app now hides cleared claims locally.
-- 7. notifications.emailed_at lets notify-email send each alert at most once.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ITEMS WRITE GUARD
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_item_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Service role, cron and SQL editor sessions carry no end-user JWT.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin');

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    NEW.deleted_at := NULL;

    IF NOT is_admin AND NEW.status NOT IN ('lost', 'found') THEN
      RAISE EXCEPTION 'New listings must be posted as lost or found.';
    END IF;
  ELSE
    NEW.created_at := OLD.created_at;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'A listing cannot be moved to another account.';
    END IF;

    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND NOT is_admin THEN
      RAISE EXCEPTION 'Deleted listings cannot be restored. Post it again instead.';
    END IF;
  END IF;

  -- Only check text that is being written, so status changes on older rows never fail.
  IF (TG_OP = 'INSERT' OR NEW.title IS DISTINCT FROM OLD.title)
     AND (length(btrim(coalesce(NEW.title, ''))) < 3 OR length(NEW.title) > 120) THEN
    RAISE EXCEPTION 'Title must be 3–120 characters.';
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.description IS DISTINCT FROM OLD.description)
     AND NEW.description IS NOT NULL AND length(NEW.description) > 1200 THEN
    RAISE EXCEPTION 'Description must stay within 1200 characters.';
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.location IS DISTINCT FROM OLD.location)
     AND NEW.location IS NOT NULL AND length(NEW.location) > 120 THEN
    RAISE EXCEPTION 'Location must stay within 120 characters.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_enforce_write ON public.items;
CREATE TRIGGER items_enforce_write
  BEFORE INSERT OR UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_item_write();

REVOKE ALL ON FUNCTION public.enforce_item_write() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. ITEM IMAGES INSERT GUARD
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_item_image_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_count integer;
  v_folder text;
  v_public_suffix text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_owner
  FROM public.items
  WHERE id = NEW.item_id
    AND deleted_at IS NULL;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Photos can only be added to your own active listing.';
  END IF;

  -- Same layout PostItem uploads to: <user_id>/<item_id>/<file>
  v_folder := auth.uid()::text || '/' || NEW.item_id::text || '/';

  IF NEW.storage_path IS NULL
     OR NOT starts_with(NEW.storage_path, v_folder)
     OR length(NEW.storage_path) = length(v_folder)
     OR position('/' IN substr(NEW.storage_path, length(v_folder) + 1)) > 0
     OR position('..' IN NEW.storage_path) > 0 THEN
    RAISE EXCEPTION 'Photo path must be inside your own listing folder.';
  END IF;

  -- The URL must be the public URL of that exact object (host is left open for local dev;
  -- the site CSP only loads images from *.supabase.co anyway).
  v_public_suffix := '/storage/v1/object/public/item-images/' || NEW.storage_path;

  IF NEW.url IS NULL
     OR NEW.url !~ '^https?://'
     OR right(NEW.url, length(v_public_suffix)) <> v_public_suffix THEN
    RAISE EXCEPTION 'Photo URL must point at the uploaded file.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.item_images
  WHERE item_id = NEW.item_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'A listing can have at most 5 photos.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS item_images_enforce_insert ON public.item_images;
CREATE TRIGGER item_images_enforce_insert
  BEFORE INSERT ON public.item_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_item_image_insert();

REVOKE ALL ON FUNCTION public.enforce_item_image_insert() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. STORAGE: NO PUBLIC BUCKET LISTING
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read own item image objects" ON storage.objects;
CREATE POLICY "Owners can read own item image objects"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------------------------
-- 4. STORAGE QUOTA IGNORES PHOTOS ALREADY QUEUED FOR PURGE
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_storage_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_user_id text;
  v_file_count integer;
  v_total_bytes bigint;
  v_incoming_size bigint;
BEGIN
  IF NEW.bucket_id = 'item-images' THEN
    v_user_id := (storage.foldername(NEW.name))[1];

    IF v_user_id IS NULL OR v_user_id = '' THEN
      RAISE EXCEPTION 'Upload rejected: Missing user identifier in file storage path';
    END IF;

    SELECT count(*), coalesce(sum((o.metadata->>'size')::bigint), 0)
    INTO v_file_count, v_total_bytes
    FROM storage.objects o
    WHERE o.bucket_id = 'item-images'
      AND (storage.foldername(o.name))[1] = v_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.media_cleanup_queue q
        WHERE q.storage_path = o.name
          AND q.status IN ('pending', 'processing')
      );

    IF v_file_count >= 30 THEN
      RAISE EXCEPTION 'Storage quota exceeded: You have reached the maximum allowed files (30). Please delete old posts to free up storage.';
    END IF;

    v_incoming_size := coalesce((NEW.metadata->>'size')::bigint, 0);
    IF v_total_bytes + v_incoming_size > 52428800 THEN
      RAISE EXCEPTION 'Storage quota exceeded: 50MB cumulative storage limit reached for this account.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_storage_quota() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS media_cleanup_queue_storage_path_idx
  ON public.media_cleanup_queue (storage_path);

-- ------------------------------------------------------------------------------
-- 5. RESOLVE_CLAIM WITHOUT DUPLICATE ALERTS
-- ------------------------------------------------------------------------------
-- claims_after_update_notify (20260915180000) already marks the item claimed,
-- notifies the claimant and closes + notifies competing claims inside the UPDATE.
-- Each insert below now only runs if that trigger did not already write the row,
-- so this works whether or not the trigger is present.

CREATE OR REPLACE FUNCTION public.resolve_claim(
  p_claim_id uuid,
  p_action text,
  p_meetup text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_claim record;
  v_item record;
  v_competing_claim record;
  v_competing_count integer := 0;
  v_action text;
  v_meetup text := NULLIF(btrim(coalesce(p_meetup, '')), '');
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_action := lower(btrim(p_action));
  IF v_action IN ('approve', 'approved') THEN
    v_action := 'approved';
  ELSIF v_action IN ('reject', 'rejected', 'decline', 'declined') THEN
    v_action := 'rejected';
  ELSE
    RAISE EXCEPTION 'Invalid resolution action: %. Must be approved or rejected.', p_action;
  END IF;

  IF v_meetup IS NOT NULL AND length(v_meetup) > 500 THEN
    RAISE EXCEPTION 'Meeting details must stay within 500 characters.';
  END IF;

  SELECT * INTO v_claim
  FROM public.claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  IF v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'This claim is already resolved (%)', v_claim.status;
  END IF;

  SELECT * INTO v_item
  FROM public.items
  WHERE id = v_claim.item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or deleted';
  END IF;

  IF v_item.user_id <> v_caller_id AND NOT public.has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Only the item owner or an admin can resolve claims on this item';
  END IF;

  IF v_action = 'approved' THEN
    SELECT count(*) INTO v_competing_count
    FROM (
      SELECT 1
      FROM public.claims
      WHERE item_id = v_item.id
        AND id <> p_claim_id
        AND status = 'pending'
      FOR UPDATE
    ) competing;

    UPDATE public.claims
    SET
      status = 'approved',
      meeting_requested = CASE WHEN v_meetup IS NOT NULL THEN true ELSE meeting_requested END,
      meeting_details = COALESCE(v_meetup, meeting_details)
    WHERE id = p_claim_id;

    UPDATE public.items
    SET status = 'claimed'
    WHERE id = v_item.id
      AND status IN ('lost', 'found');

    FOR v_competing_claim IN
      SELECT id, user_id
      FROM public.claims
      WHERE item_id = v_item.id
        AND id <> p_claim_id
        AND status = 'pending'
      FOR UPDATE
    LOOP
      UPDATE public.claims
      SET status = 'rejected'
      WHERE id = v_competing_claim.id;

      INSERT INTO public.notifications (user_id, sender_id, title, message, related_item_id, related_claim_id, kind)
      SELECT
        v_competing_claim.user_id,
        v_caller_id,
        'Item already claimed: "' || left(coalesce(v_item.title, 'Item'), 80) || '"',
        'Another claim was accepted for this item. Your claim has been closed.',
        v_item.id,
        v_competing_claim.id,
        'claim_superseded'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_claim_id = v_competing_claim.id
          AND n.kind = 'claim_superseded'
          AND n.created_at > now() - INTERVAL '2 minutes'
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, sender_id, title, message, related_item_id, related_claim_id, kind)
    SELECT
      v_claim.user_id,
      v_caller_id,
      'Claim accepted: "' || left(coalesce(v_item.title, 'Item'), 80) || '"',
      CASE
        WHEN v_meetup IS NOT NULL THEN 'Your claim was accepted. Handover location: ' || v_meetup
        ELSE 'Your claim was accepted. Use a public campus place to hand it over.'
      END,
      v_item.id,
      p_claim_id,
      'claim_approved'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_claim_id = p_claim_id
        AND n.kind = 'claim_approved'
        AND n.created_at > now() - INTERVAL '2 minutes'
    );

    RETURN jsonb_build_object(
      'status', 'approved',
      'claim_id', p_claim_id,
      'item_id', v_item.id,
      'closed_competing_claims', v_competing_count
    );
  END IF;

  UPDATE public.claims
  SET status = 'rejected'
  WHERE id = p_claim_id;

  INSERT INTO public.notifications (user_id, sender_id, title, message, related_item_id, related_claim_id, kind)
  SELECT
    v_claim.user_id,
    v_caller_id,
    'Claim declined: "' || left(coalesce(v_item.title, 'Item'), 80) || '"',
    'Your claim for "' || left(coalesce(v_item.title, 'Item'), 80) || '" was declined.',
    v_item.id,
    p_claim_id,
    'claim_rejected'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.related_claim_id = p_claim_id
      AND n.kind = 'claim_rejected'
      AND n.created_at > now() - INTERVAL '2 minutes'
  );

  RETURN jsonb_build_object(
    'status', 'rejected',
    'claim_id', p_claim_id,
    'item_id', v_item.id,
    'closed_competing_claims', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_claim(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_claim(uuid, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. CLAIMS: ONLY ADMINS HARD-DELETE
-- ------------------------------------------------------------------------------
-- 20260920120000 was a placeholder for a claimant-delete policy applied by hand,
-- so its name is unknown here. Drop every DELETE policy and recreate admin-only.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claims'
      AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.claims', r.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Admins can delete claims"
  ON public.claims
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------------------------
-- 7. ONE EMAIL PER NOTIFICATION
-- ------------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_sender_kind_unemailed
  ON public.notifications (sender_id, kind, created_at DESC)
  WHERE emailed_at IS NULL;

NOTIFY pgrst, 'reload schema';
