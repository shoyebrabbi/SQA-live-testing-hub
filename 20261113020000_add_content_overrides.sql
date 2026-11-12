ALTER TABLE public.sqa_site_settings
  ADD COLUMN IF NOT EXISTS content_overrides jsonb
  NOT NULL DEFAULT '{"bn": {}, "en": {}}'::jsonb;
