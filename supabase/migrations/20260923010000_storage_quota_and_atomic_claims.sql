-- ==============================================================================
-- CampusFind Migration: Storage Quota & Atomic Claim Resolution
-- Migration: 20260923010000_storage_quota_and_atomic_claims.sql
-- Purpose:
-- 1. Create atomic resolve_claim stored procedure (approval, claim status, auto-reject siblings, notifications)
-- 2. Create check_user_storage_quota trigger on storage.objects (30 files / 50MB quota per user)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ATOMIC CLAIM RESOLUTION STORED PROCEDURE
-- ------------------------------------------------------------------------------

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
  v_other_rejected_count integer := 0;
  v_action text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Normalize action
  v_action := lower(trim(p_action));
  IF v_action IN ('approve', 'approved') THEN
    v_action := 'approved';
  ELSIF v_action IN ('reject', 'rejected', 'decline', 'declined') THEN
    v_action := 'rejected';
  ELSE
    RAISE EXCEPTION 'Invalid resolution action: %. Must be approved or rejected.', p_action;
  END IF;

  -- Lock and fetch claim
  SELECT * INTO v_claim
  FROM public.claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  IF v_claim.status != 'pending' THEN
    RAISE EXCEPTION 'This claim is already resolved (%)', v_claim.status;
  END IF;

  -- Fetch item and verify ownership
  SELECT * INTO v_item
  FROM public.items
  WHERE id = v_claim.item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or deleted';
  END IF;

  IF v_item.user_id != v_caller_id AND NOT public.has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Only the item owner or an admin can resolve claims on this item';
  END IF;

  IF v_action = 'approved' THEN
    -- 1. Update the accepted claim
    UPDATE public.claims
    SET 
      status = 'approved',
      meeting_requested = CASE WHEN p_meetup IS NOT NULL AND length(trim(p_meetup)) > 0 THEN true ELSE meeting_requested END,
      meeting_details = CASE WHEN p_meetup IS NOT NULL AND length(trim(p_meetup)) > 0 THEN trim(p_meetup) ELSE meeting_details END
    WHERE id = p_claim_id;

    -- 2. Update item to claimed
    UPDATE public.items
    SET status = 'claimed', updated_at = now()
    WHERE id = v_item.id;

    -- 3. Auto-reject competing pending claims
    FOR v_competing_claim IN
      SELECT id, user_id
      FROM public.claims
      WHERE item_id = v_item.id
        AND id != p_claim_id
        AND status = 'pending'
      FOR UPDATE
    LOOP
      UPDATE public.claims
      SET status = 'rejected'
      WHERE id = v_competing_claim.id;

      v_other_rejected_count := v_other_rejected_count + 1;

      -- Notify superseded claimant
      INSERT INTO public.notifications (
        user_id,
        sender_id,
        title,
        message,
        related_item_id,
        related_claim_id,
        kind
      ) VALUES (
        v_competing_claim.user_id,
        v_caller_id,
        'Item already claimed: "' || coalesce(v_item.title, 'Item') || '"',
        'Another claim was accepted for this item. Your claim has been closed.',
        v_item.id,
        v_competing_claim.id,
        'claim_superseded'
      );
    END LOOP;

    -- 4. Notify accepted claimant
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      title,
      message,
      related_item_id,
      related_claim_id,
      kind
    ) VALUES (
      v_claim.user_id,
      v_caller_id,
      'Claim accepted: "' || coalesce(v_item.title, 'Item') || '"',
      CASE 
        WHEN p_meetup IS NOT NULL AND length(trim(p_meetup)) > 0 
        THEN 'Your claim was accepted. Handover location: ' || trim(p_meetup)
        ELSE 'Your claim was accepted. Use a public campus place to hand it over.'
      END,
      v_item.id,
      p_claim_id,
      'claim_approved'
    );

    RETURN jsonb_build_object(
      'status', 'approved',
      'claim_id', p_claim_id,
      'item_id', v_item.id,
      'closed_competing_claims', v_other_rejected_count
    );

  ELSE -- v_action = 'rejected'
    -- Update claim to rejected
    UPDATE public.claims
    SET status = 'rejected'
    WHERE id = p_claim_id;

    -- Notify claimant
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      title,
      message,
      related_item_id,
      related_claim_id,
      kind
    ) VALUES (
      v_claim.user_id,
      v_caller_id,
      'Claim declined: "' || coalesce(v_item.title, 'Item') || '"',
      'Your claim for "' || coalesce(v_item.title, 'Item') || '" was declined.',
      v_item.id,
      p_claim_id,
      'claim_rejected'
    );

    RETURN jsonb_build_object(
      'status', 'rejected',
      'claim_id', p_claim_id,
      'item_id', v_item.id,
      'closed_competing_claims', 0
    );
  END IF;
END;
$$;

-- Security hardening on resolve_claim
REVOKE ALL ON FUNCTION public.resolve_claim(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_claim(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_claim(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.resolve_claim IS 'Atomically resolves a claim (approve/reject), transitions item status, auto-rejects competing claims, and issues in-app notifications.';


-- ------------------------------------------------------------------------------
-- 2. AUTHENTICATED STORAGE ANTI-FLOODING QUOTA TRIGGER
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
  -- Only enforce quota on item-images bucket
  IF NEW.bucket_id = 'item-images' THEN
    -- Extract user id from path: /<user_id>/<item_id>/<file>
    v_user_id := (storage.foldername(NEW.name))[1];

    IF v_user_id IS NULL OR v_user_id = '' THEN
      RAISE EXCEPTION 'Upload rejected: Missing user identifier in file storage path';
    END IF;

    -- Count active objects and cumulative bytes for this user in item-images
    SELECT count(*), coalesce(sum((metadata->>'size')::bigint), 0)
    INTO v_file_count, v_total_bytes
    FROM storage.objects
    WHERE bucket_id = 'item-images'
      AND (storage.foldername(name))[1] = v_user_id;

    -- Enforce file count cap: max 30 files per user across all listings (enough for 6 active posts * 5 images)
    IF v_file_count >= 30 THEN
      RAISE EXCEPTION 'Storage quota exceeded: You have reached the maximum allowed files (30). Please delete old posts to free up storage.';
    END IF;

    -- Enforce storage volume cap: max 50 MB cumulative per user
    v_incoming_size := coalesce((NEW.metadata->>'size')::bigint, 0);
    IF v_total_bytes + v_incoming_size > 52428800 THEN
      RAISE EXCEPTION 'Storage quota exceeded: 50MB cumulative storage limit reached for this account.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_storage_user_quota ON storage.objects;
CREATE TRIGGER tr_check_storage_user_quota
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_storage_quota();

COMMENT ON FUNCTION public.check_user_storage_quota IS 'Enforces per-user file count (max 30) and volume (max 50MB) quotas on item-images storage bucket to prevent abuse.';
