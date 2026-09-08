-- contact_email is unused and still readable: table-level GRANT SELECT
-- cannot be revoked per column. Drop the column so it cannot leak.

DROP TRIGGER IF EXISTS items_strip_contact_email ON public.items;
DROP FUNCTION IF EXISTS public.strip_item_contact_email();
ALTER TABLE public.items DROP COLUMN IF EXISTS contact_email;
