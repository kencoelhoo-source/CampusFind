-- Claim + notification delivery: server-side alerts, sibling auto-reject,
-- withdraw, possible-match pings, realtime, and no-spam inserts.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

ALTER TYPE public.claim_status ADD VALUE IF NOT EXISTS 'withdrawn';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN (
    'general',
    'claim_submitted',
    'claim_approved',
    'claim_rejected',
    'claim_withdrawn',
    'claim_superseded',
    'item_returned',
    'item_deleted',
    'possible_match',
    'meetup_updated'
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_kind_created_at
  ON public.notifications (user_id, kind, created_at DESC);

-- ---------------------------------------------------------------------------
-- Realtime so the bell/inbox update without a refresh
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.claims REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'claims'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Direct client INSERTs into notifications are not allowed.
-- Only SECURITY DEFINER helpers below may write rows.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.notifications;

-- ---------------------------------------------------------------------------
-- Delivery helper (never throws to the caller)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.deliver_notification(
  _user_id UUID,
  _sender_id UUID,
  _title TEXT,
  _message TEXT,
  _related_item_id UUID,
  _related_claim_id UUID,
  _kind TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
  send_count INTEGER;
  safe_kind TEXT;
BEGIN
  IF _user_id IS NULL OR _sender_id IS NULL OR _user_id = _sender_id THEN
    RETURN NULL;
  END IF;

  safe_kind := COALESCE(NULLIF(btrim(_kind), ''), 'general');
  IF safe_kind NOT IN (
    'general',
    'claim_submitted',
    'claim_approved',
    'claim_rejected',
    'claim_withdrawn',
    'claim_superseded',
    'item_returned',
    'item_deleted',
    'possible_match',
    'meetup_updated'
  ) THEN
    safe_kind := 'general';
  END IF;

  IF length(btrim(coalesce(_title, ''))) = 0 OR length(_title) > 200 THEN
    RETURN NULL;
  END IF;

  IF length(btrim(coalesce(_message, ''))) = 0 OR length(_message) > 1000 THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id = _user_id
      AND kind = safe_kind
      AND related_item_id IS NOT DISTINCT FROM _related_item_id
      AND related_claim_id IS NOT DISTINCT FROM _related_claim_id
      AND created_at > now() - INTERVAL '2 minutes'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO send_count
  FROM public.notifications
  WHERE sender_id = _sender_id
    AND created_at > now() - INTERVAL '1 hour';

  IF send_count >= 20 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    sender_id,
    title,
    message,
    related_item_id,
    related_claim_id,
    kind
  )
  VALUES (
    _user_id,
    _sender_id,
    btrim(_title),
    btrim(_message),
    _related_item_id,
    _related_claim_id,
    safe_kind
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'deliver_notification failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.deliver_notification(UUID, UUID, TEXT, TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.infer_notification_kind(_title TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _title ILIKE 'Item found:%' OR _title ILIKE 'New claim:%' THEN 'claim_submitted'
    WHEN _title ILIKE 'Claim accepted:%' THEN 'claim_approved'
    WHEN _title ILIKE 'Claim declined:%' THEN 'claim_rejected'
    WHEN _title ILIKE 'Claim withdrawn:%' THEN 'claim_withdrawn'
    WHEN _title ILIKE 'Another claim was accepted%' THEN 'claim_superseded'
    WHEN _title ILIKE 'Item returned:%' OR _title ILIKE 'Marked as returned%' THEN 'item_returned'
    WHEN _title ILIKE 'Listing removed:%' THEN 'item_deleted'
    WHEN _title ILIKE 'Possible match:%' THEN 'possible_match'
    WHEN _title ILIKE 'Meetup updated:%' THEN 'meetup_updated'
    ELSE 'general'
  END;
$$;

DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _related_item_id UUID DEFAULT NULL,
  _related_claim_id UUID DEFAULT NULL,
  _kind TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_owner UUID;
  resolved_kind TEXT;
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

  resolved_kind := COALESCE(NULLIF(btrim(_kind), ''), public.infer_notification_kind(_title));

  RETURN public.deliver_notification(
    _user_id,
    auth.uid(),
    _title,
    _message,
    _related_item_id,
    _related_claim_id,
    resolved_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Claim update rules: owner resolves; claimant may withdraw; meetup edits
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_claim_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_owner UUID;
  is_admin BOOLEAN;
BEGIN
  SELECT user_id INTO item_owner
  FROM public.items
  WHERE id = NEW.item_id;

  is_admin := public.has_role(auth.uid(), 'admin');

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.message IS DISTINCT FROM OLD.message THEN
    RAISE EXCEPTION 'Claim identity and message cannot be changed.';
  END IF;

  IF NEW.meeting_details IS NOT NULL AND length(NEW.meeting_details) > 500 THEN
    RAISE EXCEPTION 'Meeting details must stay within 500 characters.';
  END IF;

  -- Claimant: withdraw a pending claim, or edit meetup after acceptance
  IF auth.uid() = OLD.user_id AND auth.uid() IS DISTINCT FROM item_owner AND NOT is_admin THEN
    IF OLD.status = 'pending' AND NEW.status = 'withdrawn' THEN
      NEW.meeting_details := OLD.meeting_details;
      NEW.meeting_requested := OLD.meeting_requested;
      RETURN NEW;
    END IF;

    IF OLD.status = 'approved' AND NEW.status = 'approved' THEN
      NEW.meeting_requested := COALESCE(NEW.meeting_details IS NOT NULL AND length(btrim(NEW.meeting_details)) > 0, false);
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Not allowed to update this claim.';
  END IF;

  IF auth.uid() IS DISTINCT FROM item_owner AND NOT is_admin THEN
    RAISE EXCEPTION 'Not allowed to update this claim.';
  END IF;

  IF OLD.status IN ('approved', 'rejected', 'withdrawn') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'This claim is already resolved.';
  END IF;

  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid claim status.';
  END IF;

  IF NEW.status = 'approved' AND NEW.meeting_details IS NOT NULL AND length(btrim(NEW.meeting_details)) > 0 THEN
    NEW.meeting_requested := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Item owners and admins can update claims" ON public.claims;
DROP POLICY IF EXISTS "Parties can update claims" ON public.claims;

CREATE POLICY "Parties can update claims"
  ON public.claims
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = claims.item_id AND items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = claims.item_id AND items.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Server-side claim notifications + auto-reject siblings
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.after_claim_insert_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_owner UUID;
  item_title TEXT;
  item_status public.item_status;
  preview TEXT;
BEGIN
  SELECT user_id, title, status
  INTO item_owner, item_title, item_status
  FROM public.items
  WHERE id = NEW.item_id;

  IF item_owner IS NULL THEN
    RETURN NEW;
  END IF;

  preview := left(btrim(NEW.message), 120);

  PERFORM public.deliver_notification(
    item_owner,
    NEW.user_id,
    CASE
      WHEN item_status = 'lost' THEN 'Item found: "' || left(item_title, 80) || '"'
      ELSE 'New claim: "' || left(item_title, 80) || '"'
    END,
    CASE
      WHEN item_status = 'lost' THEN 'A finder sent a message: "' || preview || '"'
      ELSE 'A student submitted a claim: "' || preview || '"'
    END,
    NEW.item_id,
    NEW.id,
    'claim_submitted'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'after_claim_insert_notify failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claims_after_insert_notify ON public.claims;
CREATE TRIGGER claims_after_insert_notify
  AFTER INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.after_claim_insert_notify();

CREATE OR REPLACE FUNCTION public.after_claim_update_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_owner UUID;
  item_title TEXT;
  sibling RECORD;
  has_approved BOOLEAN;
BEGIN
  SELECT user_id, title INTO item_owner, item_title
  FROM public.items
  WHERE id = NEW.item_id;

  IF item_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.items
    SET status = 'claimed'
    WHERE id = NEW.item_id
      AND status IN ('lost', 'found')
      AND deleted_at IS NULL;

    PERFORM public.deliver_notification(
      NEW.user_id,
      item_owner,
      'Claim accepted: "' || left(item_title, 80) || '"',
      CASE
        WHEN NEW.meeting_details IS NOT NULL AND length(btrim(NEW.meeting_details)) > 0
          THEN btrim(NEW.meeting_details)
        ELSE 'Your claim was accepted. Meet in a public campus spot.'
      END,
      NEW.item_id,
      NEW.id,
      'claim_approved'
    );

    FOR sibling IN
      SELECT id, user_id
      FROM public.claims
      WHERE item_id = NEW.item_id
        AND id <> NEW.id
        AND status = 'pending'
    LOOP
      UPDATE public.claims
      SET status = 'rejected'
      WHERE id = sibling.id
        AND status = 'pending';

      PERFORM public.deliver_notification(
        sibling.user_id,
        item_owner,
        'Another claim was accepted for "' || left(item_title, 80) || '"',
        'The poster accepted a different claim for this item. You can look for another listing.',
        NEW.item_id,
        sibling.id,
        'claim_superseded'
      );
    END LOOP;

    RETURN NEW;
  END IF;

  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.claims
      WHERE item_id = NEW.item_id AND status = 'approved'
    ) INTO has_approved;

    IF has_approved THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.items
      WHERE id = NEW.item_id AND (status = 'returned' OR deleted_at IS NOT NULL)
    ) THEN
      RETURN NEW;
    END IF;

    PERFORM public.deliver_notification(
      NEW.user_id,
      item_owner,
      'Claim declined: "' || left(item_title, 80) || '"',
      'Your claim for "' || left(item_title, 80) || '" was declined.',
      NEW.item_id,
      NEW.id,
      'claim_rejected'
    );

    RETURN NEW;
  END IF;

  IF NEW.status = 'withdrawn' AND OLD.status IS DISTINCT FROM 'withdrawn' THEN
    PERFORM public.deliver_notification(
      item_owner,
      NEW.user_id,
      'Claim withdrawn: "' || left(item_title, 80) || '"',
      'The student withdrew their claim on this listing.',
      NEW.item_id,
      NEW.id,
      'claim_withdrawn'
    );

    RETURN NEW;
  END IF;

  IF NEW.status = 'approved'
     AND OLD.status = 'approved'
     AND NEW.meeting_details IS DISTINCT FROM OLD.meeting_details THEN
    IF auth.uid() = item_owner THEN
      PERFORM public.deliver_notification(
        NEW.user_id,
        item_owner,
        'Meetup updated: "' || left(item_title, 80) || '"',
        COALESCE(NULLIF(btrim(NEW.meeting_details), ''), 'Meetup details were updated. Check your claims tab.'),
        NEW.item_id,
        NEW.id,
        'meetup_updated'
      );
    ELSE
      PERFORM public.deliver_notification(
        item_owner,
        NEW.user_id,
        'Meetup updated: "' || left(item_title, 80) || '"',
        COALESCE(NULLIF(btrim(NEW.meeting_details), ''), 'Meetup details were updated. Check your inbox.'),
        NEW.item_id,
        NEW.id,
        'meetup_updated'
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'after_claim_update_notify failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claims_after_update_notify ON public.claims;
CREATE TRIGGER claims_after_update_notify
  AFTER UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.after_claim_update_notify();

REVOKE EXECUTE ON FUNCTION public.after_claim_insert_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.after_claim_update_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_claim_update() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Returned / deleted listings notify the people in the claim thread
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.after_item_change_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF NEW.status = 'returned' AND OLD.status IS DISTINCT FROM 'returned' THEN
    FOR rec IN
      SELECT id, user_id
      FROM public.claims
      WHERE item_id = NEW.id
        AND status IN ('approved', 'pending')
        AND user_id <> NEW.user_id
    LOOP
      PERFORM public.deliver_notification(
        rec.user_id,
        NEW.user_id,
        'Item returned: "' || left(NEW.title, 80) || '"',
        'The poster marked "' || left(NEW.title, 80) || '" as returned.',
        NEW.id,
        rec.id,
        'item_returned'
      );
    END LOOP;

    UPDATE public.claims
    SET status = 'rejected'
    WHERE item_id = NEW.id
      AND status = 'pending';
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    FOR rec IN
      SELECT id, user_id
      FROM public.claims
      WHERE item_id = NEW.id
        AND status IN ('pending', 'approved')
        AND user_id <> NEW.user_id
    LOOP
      PERFORM public.deliver_notification(
        rec.user_id,
        NEW.user_id,
        'Listing removed: "' || left(NEW.title, 80) || '"',
        'The poster removed "' || left(NEW.title, 80) || '" from the board.',
        NEW.id,
        rec.id,
        'item_deleted'
      );
    END LOOP;

    UPDATE public.claims
    SET status = 'rejected'
    WHERE item_id = NEW.id
      AND status = 'pending';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'after_item_change_notify failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_after_change_notify ON public.items;
CREATE TRIGGER items_after_change_notify
  AFTER UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.after_item_change_notify();

REVOKE EXECUTE ON FUNCTION public.after_item_change_notify() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Possible lost/found matches when a listing is posted
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.significant_title_tokens(title TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT tok), ARRAY[]::TEXT[])
  FROM (
    SELECT unnest(regexp_split_to_array(lower(btrim(coalesce(title, ''))), '[^a-z0-9]+')) AS tok
  ) s
  WHERE length(tok) >= 4
    AND tok NOT IN (
      'lost', 'found', 'item', 'from', 'with', 'near', 'this', 'that',
      'have', 'been', 'something', 'missing', 'please', 'just', 'about',
      'some', 'campus', 'sfit', 'room', 'floor'
    );
$$;

CREATE OR REPLACE FUNCTION public.after_item_insert_match_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opposite public.item_status;
  rec RECORD;
  new_tokens TEXT[];
  sent INTEGER := 0;
BEGIN
  IF NEW.status NOT IN ('lost', 'found') THEN
    RETURN NEW;
  END IF;

  new_tokens := public.significant_title_tokens(NEW.title);
  IF COALESCE(array_length(new_tokens, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  opposite := CASE WHEN NEW.status = 'lost' THEN 'found'::public.item_status ELSE 'lost'::public.item_status END;

  FOR rec IN
    SELECT i.id, i.user_id, i.title
    FROM public.items i
    WHERE i.deleted_at IS NULL
      AND i.id <> NEW.id
      AND i.status = opposite
      AND i.category = NEW.category
      AND i.user_id <> NEW.user_id
      AND i.created_at > now() - INTERVAL '60 days'
      AND (
        lower(i.title) = lower(NEW.title)
        OR public.significant_title_tokens(i.title) && new_tokens
      )
    ORDER BY i.created_at DESC
    LIMIT 5
  LOOP
    PERFORM public.deliver_notification(
      rec.user_id,
      NEW.user_id,
      'Possible match: "' || left(NEW.title, 80) || '"',
      CASE
        WHEN NEW.status = 'found' THEN
          'Someone posted a found item that may match your lost listing "' || left(rec.title, 80) || '". Open it and tap “This is mine” if it is yours.'
        ELSE
          'Someone posted a lost item that may match your found listing "' || left(rec.title, 80) || '". Open it and tap “I found this” if you have it.'
      END,
      NEW.id,
      NULL,
      'possible_match'
    );
    sent := sent + 1;
    EXIT WHEN sent >= 5;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'after_item_insert_match_notify failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_after_insert_match_notify ON public.items;
CREATE TRIGGER items_after_insert_match_notify
  AFTER INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.after_item_insert_match_notify();

REVOKE EXECUTE ON FUNCTION public.after_item_insert_match_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.significant_title_tokens(TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Deduplicate the two item rate-limit triggers (same function, ran twice)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS items_rate_limit_trigger ON public.items;
