-- ==============================================================================
-- CampusFind V3 Database Verification Script
-- Run this script in the Supabase SQL Editor.
-- It tests all tables, columns, indexes, triggers, types, policies, and RPCs.
-- ==============================================================================

WITH verification_results AS (
  -- 1. Check Extensions
  SELECT 
    'Extension' AS category,
    'pg_trgm' AS target,
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') 
      THEN '✅ PASS' 
      ELSE '❌ MISSING' 
    END AS status,
    coalesce((SELECT 'Installed in schema: ' || n.nspname FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE e.extname = 'pg_trgm'), 'Not found') AS details

  UNION ALL

  -- 2. Check Custom Types
  SELECT 
    'Type',
    'cleanup_job_status (ENUM)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cleanup_job_status') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Required for media cleanup queue state machine'

  UNION ALL

  SELECT 
    'Type',
    'search_result_item (COMPOSITE)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'search_result_item') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Required for deterministic search & keyset pagination return set'

  UNION ALL

  SELECT 
    'Type Attribute',
    'search_result_item.poster_name (Single-Roundtrip Hydration)',
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM pg_type t
        JOIN pg_class c ON c.oid = t.typrelid
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE t.typname = 'search_result_item' 
          AND a.attname = 'poster_name' 
          AND NOT a.attisdropped
      ) THEN '✅ PASS'
      ELSE '❌ MISSING (Run updated search_and_pagination.sql)'
    END,
    'Enables single database roundtrip hydration for public browse & search'

  UNION ALL

  -- 3. Check Tables & RLS
  SELECT 
    'Table',
    'media_cleanup_queue',
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'media_cleanup_queue') 
      THEN '✅ PASS' 
      ELSE '❌ MISSING' 
    END,
    CASE 
      WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'media_cleanup_queue') = true
      THEN 'RLS enabled (Secure)'
      ELSE 'RLS NOT enabled or table missing'
    END

  UNION ALL

  -- 4. Check RLS Policy on media_cleanup_queue
  SELECT 
    'Policy',
    'Deny all public access to media_cleanup_queue',
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'media_cleanup_queue')
      THEN '✅ PASS'
      ELSE '❌ MISSING (Run linter_security_fixes.sql)'
    END,
    'Silences Supabase linter rule 0008_rls_enabled_no_policy'

  UNION ALL

  -- 5. Check Table Columns
  SELECT 
    'Column',
    'items.fts (Generated TSVector)',
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'fts')
      THEN '✅ PASS'
      ELSE '❌ MISSING'
    END,
    'Required for full-text search'

  UNION ALL

  SELECT 
    'Column',
    'items.deleted_at (Timestamp)',
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'deleted_at')
      THEN '✅ PASS'
      ELSE '❌ MISSING'
    END,
    'Required for soft-deletions'

  UNION ALL

  -- 6. Check Indexes
  SELECT 
    'Index',
    'items_fts_idx',
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'items_fts_idx') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'GIN index for fast full-text matching'

  UNION ALL

  SELECT 
    'Index',
    'items_title_trgm_idx',
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'items_title_trgm_idx') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'GIN trigram index on title'

  UNION ALL

  SELECT 
    'Index',
    'media_cleanup_queue_status_eligible_idx',
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'media_cleanup_queue_status_eligible_idx') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Queue status and eligibility index for background worker'

  UNION ALL

  -- 7. Check Triggers
  SELECT 
    'Trigger',
    'tr_enqueue_deleted_item_media on items',
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_enqueue_deleted_item_media')
      THEN '✅ PASS'
      ELSE '❌ MISSING'
    END,
    'Fires AFTER UPDATE on items to enqueue orphaned images'

  UNION ALL

  SELECT 
    'Trigger',
    'tr_check_storage_user_quota on storage.objects',
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_check_storage_user_quota')
      THEN '✅ PASS'
      ELSE '❌ MISSING (Run storage_quota_and_atomic_claims.sql)'
    END,
    'Enforces 30 files / 50MB per-user quota to prevent storage flooding'

  UNION ALL

  -- 8. Check Core RPC Functions
  SELECT 
    'RPC Function',
    'search_public_items',
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'search_public_items')
      THEN '✅ PASS'
      ELSE '❌ MISSING'
    END,
    coalesce((
      SELECT CASE 
        WHEN array_to_string(proconfig, ',') LIKE '%extensions%' 
        THEN 'search_path includes extensions (Correct)' 
        ELSE 'search_path missing extensions (Run updated search_and_pagination.sql)' 
      END
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'search_public_items'
    ), 'Function missing')

  UNION ALL

  SELECT 
    'RPC Function',
    'browse_public_items',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'browse_public_items') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Keyset pagination RPC for browse board'

  UNION ALL

  SELECT 
    'RPC Function',
    'get_recent_public_items',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_recent_public_items') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Home page recent listings RPC'

  UNION ALL

  SELECT 
    'RPC Function',
    'get_home_stats',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_home_stats') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Home page metrics statistics RPC'

  UNION ALL

  SELECT 
    'RPC Function',
    'claim_media_cleanup_jobs',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'claim_media_cleanup_jobs') THEN '✅ PASS' ELSE '❌ MISSING' END,
    'Internal worker job claiming RPC'

  UNION ALL

  SELECT 
    'RPC Function',
    'resolve_claim',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'resolve_claim') THEN '✅ PASS' ELSE '❌ MISSING (Run storage_quota_and_atomic_claims.sql)' END,
    'Atomic single-transaction claim resolution, item state, and sibling rejection RPC'
)
SELECT 
  category,
  target,
  status,
  details
FROM verification_results
ORDER BY 
  CASE status WHEN '❌ MISSING' THEN 1 ELSE 2 END,
  category,
  target;
