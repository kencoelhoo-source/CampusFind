-- One-time: sign-in lock lives in app_settings.
-- Flip it from the Dashboard (or RPC). No more pasting trigger SQL.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sfit_email_lock BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, sfit_email_lock)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.get_sfit_email_lock()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sfit_email_lock FROM public.app_settings WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION public.set_sfit_email_lock(_enabled BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT lower(email) INTO actor
  FROM auth.users
  WHERE id = auth.uid();

  IF actor IS DISTINCT FROM 'kencoelhoo@student.sfit.ac.in' THEN
    RAISE EXCEPTION 'Only the CampusFind owner can change the sign-in lock.';
  END IF;

  INSERT INTO public.app_settings (id, sfit_email_lock, updated_at)
  VALUES (1, _enabled, now())
  ON CONFLICT (id) DO UPDATE
    SET sfit_email_lock = EXCLUDED.sfit_email_lock,
        updated_at = now();

  RETURN _enabled;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sfit_email_lock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_sfit_email_lock(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sfit_email_lock() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_sfit_email_lock(BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_signup_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain TEXT;
  locked BOOLEAN;
BEGIN
  SELECT sfit_email_lock INTO locked
  FROM public.app_settings
  WHERE id = 1;

  IF COALESCE(locked, false) = false THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;

  IF length(NEW.email) - length(replace(NEW.email, '@', '')) <> 1 THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;

  domain := lower(split_part(btrim(NEW.email), '@', 2));

  IF domain NOT IN ('student.sfit.ac.in', 'sfit.ac.in') THEN
    RAISE EXCEPTION 'Only SFIT email domains (@student.sfit.ac.in or @sfit.ac.in) are allowed to sign up.';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.app_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END;
$$;
