-- 1. Restricted Domain Sign-Up Trigger Function
CREATE OR REPLACE FUNCTION public.check_signup_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email NOT LIKE '%@student.sfit.ac.in' AND NEW.email NOT LIKE '%@sfit.ac.in' THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for email domain restriction
CREATE OR REPLACE TRIGGER check_email_domain_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_signup_email_domain();

-- Revoke public execution of signup checker
REVOKE EXECUTE ON FUNCTION public.check_signup_email_domain() FROM PUBLIC;


-- 2. Database Rate Limiting Function for Posting Items
CREATE OR REPLACE FUNCTION public.check_item_posting_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count
  FROM public.items
  WHERE user_id = auth.uid() AND created_at > now() - INTERVAL '24 hours';
  
  IF item_count >= 10 THEN
    RAISE EXCEPTION 'You have reached the maximum limit of 10 item posts per 24 hours.';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for item posting rate limit
CREATE OR REPLACE TRIGGER items_rate_limit_trigger
  BEFORE INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.check_item_posting_rate_limit();

-- Revoke public execution of item rate limiter
REVOKE EXECUTE ON FUNCTION public.check_item_posting_rate_limit() FROM PUBLIC;


-- Database Rate Limiting Function for Submitting Claims
CREATE OR REPLACE FUNCTION public.check_claim_submitting_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO claim_count
  FROM public.claims
  WHERE user_id = auth.uid() AND created_at > now() - INTERVAL '24 hours';
  
  IF claim_count >= 15 THEN
    RAISE EXCEPTION 'You have reached the maximum limit of 15 claims per 24 hours.';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for claim submitting rate limit
CREATE OR REPLACE TRIGGER claims_rate_limit_trigger
  BEFORE INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.check_claim_submitting_rate_limit();

-- Revoke public execution of claim rate limiter
REVOKE EXECUTE ON FUNCTION public.check_claim_submitting_rate_limit() FROM PUBLIC;


-- 3. Soft Deletes for Items
-- Add deleted_at column to items table
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Soft delete trigger function
CREATE OR REPLACE FUNCTION public.soft_delete_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.items
  SET deleted_at = now()
  WHERE id = OLD.id;
  RETURN NULL; -- Aborts the physical DELETE operation
END;
$$;

-- Trigger for soft delete
CREATE OR REPLACE TRIGGER items_soft_delete_trigger
  BEFORE DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_item();

-- Revoke public execution of soft delete trigger
REVOKE EXECUTE ON FUNCTION public.soft_delete_item() FROM PUBLIC;

-- Drop old select policy on items
DROP POLICY IF EXISTS "Anyone can view items" ON public.items;

-- Create new select policy on items to filter out soft-deleted records
CREATE POLICY "Anyone can view active items" ON public.items
  FOR SELECT USING (deleted_at IS NULL);

-- Drop old select policy on item_images
DROP POLICY IF EXISTS "Anyone can view item images" ON public.item_images;

-- Create new select policy on item_images to filter out images of soft-deleted items
CREATE POLICY "Anyone can view active item images" ON public.item_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_id AND items.deleted_at IS NULL
    )
  );


-- 4. Supabase Database Linter Fixes
-- Drop the overly permissive insert policy on notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Drop the broad select policy on storage objects
DROP POLICY IF EXISTS "Anyone can view item images storage" ON storage.objects;

-- Set search_path and revoke execute on notify_match_found_item if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_match_found_item') THEN
    ALTER FUNCTION public.notify_match_found_item() SET search_path = public;
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.notify_match_found_item() FROM PUBLIC;';
  END IF;
END;
$$;

-- Revoke public execution on other triggers and functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID) FROM PUBLIC;

-- Ensure create_notification is still explicitly executable by authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;
