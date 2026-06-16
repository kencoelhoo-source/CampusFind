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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    related_item_id,
    related_claim_id
  )
  VALUES (
    _user_id,
    _title,
    _message,
    _related_item_id,
    _related_claim_id
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'claims_item_user_unique'
  ) THEN
    ALTER TABLE public.claims
      ADD CONSTRAINT claims_item_user_unique UNIQUE (item_id, user_id);
  END IF;
END;
$$;
