-- ==============================================================================
-- CampusFind Migration: Fix Soft-Delete RLS & Restore Storage Read
-- Migration: 20260923020000_fix_soft_delete_and_storage_read.sql
-- Purpose:
--   1. Allow item owners to see their own items (including soft-deleted ones)
--      so the UPDATE (soft-delete) doesn't fail RLS visibility checks.
--   2. Restore the storage.objects SELECT policy for item-images bucket
--      (was dropped in 20260916160000 and never recreated).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. OWNER SELECT POLICY ON ITEMS
-- ------------------------------------------------------------------------------
-- PostgreSQL evaluates SELECT policies during UPDATE — the post-update row must
-- be visible under at least one SELECT policy. The existing "Anyone can view
-- active items" policy uses `deleted_at IS NULL`, which hides the row the moment
-- deleted_at is set, causing the soft-delete UPDATE to fail with:
--   "new row violates row-level security policy for table items"
--
-- This policy lets authenticated owners always see their own items, regardless
-- of deleted_at. It does NOT expose deleted items to other users.

DROP POLICY IF EXISTS "Owners can see own items including deleted" ON public.items;
CREATE POLICY "Owners can see own items including deleted"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. RESTORE STORAGE SELECT POLICY
-- ------------------------------------------------------------------------------
-- The linter-fixes migration (20260916160000) dropped all SELECT policies on
-- storage.objects to stop bucket file listing. However, this also blocked
-- direct object reads through the Supabase client. Even though the bucket is
-- marked public (CDN URLs work), restoring a SELECT policy ensures all access
-- paths work correctly (client SDK, signed URLs, direct fetch).

DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
CREATE POLICY "Public can view item images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'item-images');

NOTIFY pgrst, 'reload schema';
