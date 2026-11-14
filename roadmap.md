# Smoke
## OpenCrawl precedents
- [x] Add connector-only ledger searches, bounded fetching and resilient parsing.
- [x] Store and display precedents without affecting rumor scoring.
- [x] Test rules and verify a live trace with OpenCrawl (successful search returned zero matching cases; card correctly hidden).

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

## Evidence-first design and accessibility
- [x] Refine home, saved-trace discovery and shared visual hierarchy.
- [x] Improve evidence navigation, keyboard access and small-screen layouts.
- [x] Verify saved live evidence, filters, export and accessibility without new provider calls.

## Visual and feel revamp
- [x] Apply the serif/sans/mono type system, paper-ink-ember palette and restrained surfaces.
- [x] Group the trace into answer, proof and context; compact the header and analyst summary.
- [x] Give the spread map an accessible replay control and the evidence table stable row rhythm.
- [x] Add restrained motion with skeleton states and reduced-motion support.
- [x] Verify 1440, 1280, tablet and phone with no sideways page scroll, plus tests.
