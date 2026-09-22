-- Move pg_trgm to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Fix anon_security_definer_function_executable & authenticated_security_definer_function_executable

-- 1. Convert frontend read RPCs from SECURITY DEFINER to SECURITY INVOKER
-- These functions just read public.items which already has RLS policies allowing anon/authenticated read
ALTER FUNCTION public.browse_public_items(text, text, integer, timestamptz, uuid) SECURITY INVOKER;
ALTER FUNCTION public.search_public_items(text, text, text, integer, real, timestamptz, uuid) SECURITY INVOKER SET search_path = public, extensions;
ALTER FUNCTION public.get_home_stats() SECURITY INVOKER;
ALTER FUNCTION public.get_public_item(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_recent_public_items(integer) SECURITY INVOKER;
ALTER FUNCTION public.get_related_public_items(uuid, text, text, integer) SECURITY INVOKER;
ALTER FUNCTION public.list_public_item_images(uuid[]) SECURITY INVOKER;
ALTER FUNCTION public.list_public_items() SECURITY INVOKER;
ALTER FUNCTION public.list_public_poster_names(uuid[]) SECURITY INVOKER;

-- Explicit deny-all policy on media_cleanup_queue to satisfy linter rule 0008_rls_enabled_no_policy
-- (Service role key bypasses RLS; public/anon/authenticated roles are fully blocked)
DROP POLICY IF EXISTS "Deny all public access to media_cleanup_queue" ON public.media_cleanup_queue;
CREATE POLICY "Deny all public access to media_cleanup_queue"
ON public.media_cleanup_queue
FOR ALL
TO public
USING (false);

-- 2. Explicitly manage EXECUTE grants for SECURITY DEFINER functions
-- Supabase linter warns when PUBLIC implicitly has EXECUTE on a SECURITY DEFINER function.

-- can_view_profile: Used by frontend to check if a user can view another user's profile
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO anon, authenticated;

-- check_item_availability: Used by RLS policies for claims, needs to bypass RLS to check items
REVOKE EXECUTE ON FUNCTION public.check_item_availability(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_item_availability(uuid) TO authenticated;

-- sfit_session_allowed: Used by RLS policies and frontend to verify @sfit.ac.in emails
REVOKE EXECUTE ON FUNCTION public.sfit_session_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sfit_session_allowed() TO anon, authenticated;

-- get_sfit_email_lock / set_sfit_email_lock: Used by frontend during signup flow
REVOKE EXECUTE ON FUNCTION public.get_sfit_email_lock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sfit_email_lock() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_sfit_email_lock(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_sfit_email_lock(boolean) TO anon, authenticated;

-- 3. Internal functions (Triggers and Edge Functions) - completely block public access

-- claim_media_cleanup_jobs: Only called by Edge Function (service role)
REVOKE EXECUTE ON FUNCTION public.claim_media_cleanup_jobs(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_media_cleanup_jobs(integer) FROM anon, authenticated;

-- create_notification: Only called by Edge Function or database triggers
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, uuid, uuid, text) FROM anon, authenticated;

-- enqueue_deleted_item_media: Trigger function, should never be manually executed
REVOKE EXECUTE ON FUNCTION public.enqueue_deleted_item_media() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_deleted_item_media() FROM anon, authenticated;
