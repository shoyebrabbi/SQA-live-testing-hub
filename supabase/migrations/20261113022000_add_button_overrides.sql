ALTER TABLE public.sqa_site_settings
  ADD COLUMN IF NOT EXISTS button_overrides jsonb
  NOT NULL DEFAULT '{}'::jsonb;
