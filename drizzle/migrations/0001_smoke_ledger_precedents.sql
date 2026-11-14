CREATE TABLE public.precedents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 trace_id uuid NOT NULL REFERENCES public.traces(id),
 document_id text NOT NULL,
 case_title text NOT NULL,
 outlet text NOT NULL DEFAULT '',
 first_reported_at text,
 sourcing text NOT NULL DEFAULT '',
 deal_type text NOT NULL DEFAULT '',
 outcome text NOT NULL DEFAULT '',
 resolved boolean NOT NULL DEFAULT false,
 days_to_resolution integer,
 resolution_source text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(trace_id, document_id)
);
GRANT SELECT ON public.precedents TO anon, authenticated;
GRANT ALL ON public.precedents TO service_role;
ALTER TABLE public.precedents ENABLE ROW LEVEL SECURITY;
CREATE POLICY precedents_public_read ON public.precedents FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX precedents_trace_idx ON public.precedents(trace_id);