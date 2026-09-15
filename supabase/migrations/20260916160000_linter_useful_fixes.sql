-- Advisor WARN cleanup (only the three useful fixes):
-- 1) Stop listing every file in the public photo bucket.
--    Known public URLs in item_images still work.
-- 2) Trigger/enforcer functions must not be callable as /rest/v1/rpc.
-- 3) Pin search_path on two helpers.

DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view item images storage" ON storage.objects;

ALTER FUNCTION public.infer_notification_kind(TEXT) SET search_path = public;
ALTER FUNCTION public.significant_title_tokens(TEXT) SET search_path = public;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'after_claim_insert_notify()',
    'after_claim_update_notify()',
    'after_item_change_notify()',
    'after_item_insert_match_notify()',
    'check_claim_submitting_rate_limit()',
    'check_item_posting_rate_limit()',
    'check_signup_email_domain()',
    'enforce_claim_insert()',
    'enforce_claim_update()',
    'enforce_notification_update()',
    'soft_delete_item()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END;
$$;
