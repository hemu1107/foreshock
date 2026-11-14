# Smoke
- [x] Build the trace workspace, shared navigation and sample controls.
- [x] Add two fictional traces, deterministic scoring and rule tests.
- [x] Build trace results, spread map, evidence filters, watchlist and method.
- [x] Verify sample tracing, watching, export and mobile layouts.

## Live pipeline
- [x] Connect the You.com credential and choose an available classification model.
- [x] Add saved live traces, mentions, history and durable processing leases.
- [x] Implement protected search, contents, classification, research, scoring and re-check processing.
- [x] Wire live progress polling and saved watchlists while preserving fictional samples.
- [x] Test live tracing end to end with a real query and verify error recovery.
Implementation note: processing uses awaited, bounded server stages while the workspace is open, not an unawaited background task. Interrupted traces offer Resume trace.

## Polish pass
- [x] Make empty, loading and error states actionable across the workspace.
- [x] Deconflict dense spread maps and cluster echoes.
- [x] Export complete, numbered markdown briefs.
- [x] Label saved versus fresh traces without altering persistence.
- [x] Verify laptop layouts, contrast and keyboard focus with tests and browser checks.
