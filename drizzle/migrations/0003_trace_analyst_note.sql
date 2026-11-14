ALTER TABLE public.traces ADD COLUMN analyst_note jsonb;
GRANT SELECT (analyst_note) ON public.traces TO anon, authenticated;