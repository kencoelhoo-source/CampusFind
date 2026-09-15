-- Production Performance & Anti-Spam Hardening Migration
-- 1. Covering & Partial Indexes for High-Traffic Query Paths
-- 2. Database-level Anti-Spam Rate Limiting on Item Creation

-- ============================================================================
-- 1. PRODUCTION DATABASE INDEXES
-- ============================================================================

-- Fast lookup for Home & Browse feeds (status + timestamp, excluding soft-deleted)
CREATE INDEX IF NOT EXISTS idx_items_status_created_at
  ON public.items (status, created_at DESC)
  WHERE deleted_at IS NULL;

-- Fast lookup for User Dashboard listings
CREATE INDEX IF NOT EXISTS idx_items_user_id_created_at
  ON public.items (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Fast lookup for category-filtered feeds
CREATE INDEX IF NOT EXISTS idx_items_category_created_at
  ON public.items (category, created_at DESC)
  WHERE deleted_at IS NULL;

-- Claims: Fast lookup for claims on an item (Owner View)
CREATE INDEX IF NOT EXISTS idx_claims_item_id_created_at
  ON public.claims (item_id, created_at DESC);

-- Claims: Fast lookup for claims submitted by a user (Claimant View)
CREATE INDEX IF NOT EXISTS idx_claims_user_id_created_at
  ON public.claims (user_id, created_at DESC);

-- Claims: Fast lookup by status
CREATE INDEX IF NOT EXISTS idx_claims_status_created_at
  ON public.claims (status, created_at DESC);

-- Notifications: Ultra-fast index for Navbar unread counter & Dashboard notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created_at
  ON public.notifications (user_id, read, created_at DESC);

-- Item Images: Fast join with items
CREATE INDEX IF NOT EXISTS idx_item_images_item_id
  ON public.item_images (item_id);

-- Profiles: Fast user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles (user_id);


-- ============================================================================
-- 2. ANTI-SPAM POSTING RATE LIMIT (5 posts / hour per user)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_item_posting_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_posts_count INTEGER;
BEGIN
  -- Admins bypass rate limiting
  IF public.has_role(NEW.user_id, 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO recent_posts_count
  FROM public.items
  WHERE user_id = NEW.user_id
    AND created_at > (now() - INTERVAL '1 hour');

  IF recent_posts_count >= 5 THEN
    RAISE EXCEPTION 'Posting limit reached: You can post up to 5 items per hour to protect campus board quality. Please wait a bit before submitting another item.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_item_rate_limit ON public.items;
CREATE TRIGGER trigger_check_item_rate_limit
  BEFORE INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.check_item_posting_rate_limit();

REVOKE EXECUTE ON FUNCTION public.check_item_posting_rate_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_item_posting_rate_limit() TO authenticated;
