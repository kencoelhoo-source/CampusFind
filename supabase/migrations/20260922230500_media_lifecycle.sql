CREATE TYPE public.cleanup_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS public.media_cleanup_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path text NOT NULL,
  status public.cleanup_job_status DEFAULT 'pending' NOT NULL,
  eligible_at timestamptz NOT NULL,
  attempts int DEFAULT 0 NOT NULL,
  last_error text,
  created_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

-- Enable RLS (default deny all for public access)
ALTER TABLE public.media_cleanup_queue ENABLE ROW LEVEL SECURITY;
-- Index for the worker to find jobs quickly
CREATE INDEX media_cleanup_queue_status_eligible_idx ON public.media_cleanup_queue (status, eligible_at);

-- Trigger function to enqueue media cleanup when an item is deleted
CREATE OR REPLACE FUNCTION public.enqueue_deleted_item_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the item was just soft deleted
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO public.media_cleanup_queue (storage_path, eligible_at)
    SELECT storage_path, NEW.deleted_at + interval '30 days'
    FROM public.item_images
    WHERE item_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enqueue_deleted_item_media ON public.items;
CREATE TRIGGER tr_enqueue_deleted_item_media
AFTER UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_deleted_item_media();

-- RPC for the Edge Function to safely claim jobs
CREATE OR REPLACE FUNCTION public.claim_media_cleanup_jobs(batch_size int DEFAULT 100)
RETURNS TABLE (
  job_id uuid,
  path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.media_cleanup_queue
    WHERE status = 'pending'
      AND eligible_at <= now()
    ORDER BY eligible_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.media_cleanup_queue q
  SET status = 'processing',
      attempts = q.attempts + 1
  FROM claimed c
  WHERE q.id = c.id
  RETURNING q.id AS job_id, q.storage_path AS path;
END;
$$;
