DROP POLICY IF EXISTS traces_public_watch ON public.traces;
REVOKE INSERT, UPDATE, DELETE ON public.traces, public.mentions, public.status_history, public.precedents FROM anon, authenticated;
REVOKE SELECT ON public.traces FROM anon, authenticated;
GRANT SELECT (id,query,claim,entities,window_days,stage,status,confidence,smoke_score,summary_md,confirm_signals,kill_signals,watch_signals,origin_mention_id,watching,created_at,checked_at,error,paused,rechecking) ON public.traces TO anon, authenticated;