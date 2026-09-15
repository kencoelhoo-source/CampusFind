-- Found items: still with the finder, or already left at a campus desk.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS held_where TEXT,
  ADD COLUMN IF NOT EXISTS held_at TEXT;

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_held_where_check;

ALTER TABLE public.items
  ADD CONSTRAINT items_held_where_check
  CHECK (held_where IS NULL OR held_where IN ('with_me', 'at_desk'));

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_held_at_matches_where;

ALTER TABLE public.items
  ADD CONSTRAINT items_held_at_matches_where
  CHECK (
    (held_where IS DISTINCT FROM 'at_desk' OR (held_at IS NOT NULL AND length(btrim(held_at)) > 0 AND length(held_at) <= 100))
    AND (held_where IS DISTINCT FROM 'with_me' OR held_at IS NULL)
  );

-- Existing found listings were implied "with the finder".
UPDATE public.items
SET held_where = 'with_me',
    held_at = NULL
WHERE status = 'found'
  AND held_where IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_held_at
  ON public.items (held_at)
  WHERE held_at IS NOT NULL AND deleted_at IS NULL;
