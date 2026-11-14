# Smoke

**Find the smoke before the fire.**

Smoke is a rumor-tracing intelligence tool for business and tech rumors. Paste a
claim and Smoke searches the live web, reads the articles, finds who reported it
first, and separates independent reporting from the echo that follows. Ten
articles that all repeat one scoop count as one source, not ten.

The output is a verdict on a fixed scale — **Whisper → Rumor → Corroborated →
Confirmed** (with **Denied** and **Went cold** for the dead ends) — plus a Smoke
Score from 0 to 100, a spread map of who said what and when, a searchable
evidence table, and a one-click markdown brief.

## What is in this repo

| Area | Where |
| --- | --- |
| Pages | `src/routes/` — home (`index.tsx`), trace result (`trace.$id.tsx`), `watchlist.tsx`, `method.tsx` |
| App shell, nav, shared state | `src/components/smoke/workspace.tsx` |
| Evidence UI | `src/components/smoke/evidence.tsx` (status badge, spread map, evidence table, verdict card) |
| Signal stack | `src/components/smoke/signals.tsx` + aggregation rules in `src/lib/signals.ts` |
| Ledger precedents | `src/components/smoke/precedents.tsx` + `src/lib/precedents.ts` |
| Empty / loading / error states | `src/components/smoke/state.tsx` |
| Saved-trace discovery | `src/components/smoke/trace-library.tsx` |
| Domain rules, scoring, official-source rules, spread layout, brief export | `src/lib/` |
| Pipeline stages and query building | `src/lib/pipeline.ts` (shared), `src/lib/pipeline.server.ts` (runs on the server) |
| Provider calls (search, contents, classification, ledger) | `src/lib/adapters.server.ts`, `src/lib/opencrawl.server.ts` |
| Database access and processing leases | `src/lib/live.functions.ts`, `src/lib/live.ts` |
| Database schema and migrations | `drizzle/migrations/` |
| Design tokens and global styles | `src/styles.css` |
| Fictional demo samples | `src/mocks/sampleTraces.ts` (only reachable with `?demo=1`) |

## Running it locally

```sh
npm install
npm run dev
```

Scripts: `npm run dev` (dev server), `npm run build`, `npm run preview`,
`npm run lint`, `npm run format`, `npm run test` (vitest), `npm run test:watch`.

`.env` holds only the backend's public project reference and publishable key, so
a fresh clone starts without extra setup. The values the app needs to reach the
live web and the ledger are **not** in this repo — see below.

## How a live trace runs

1. **Search** — You.com web search runs the claim queries plus official-source
   queries (definitive agreement, press release, statement, talks ended).
2. **Read** — up to 20 articles are fetched, mainstream outlets first.
3. **Classify** — Gemini 4 Argon (via Lovable's AI gateway) labels each source's
   sourcing and relation to the claim.
4. **Rules** — deterministic official-source, denial, supersede and echo rules in
   `src/lib/official.ts` override the model's labels, so status stays explainable.
5. **Ledger** — OpenCrawl case searches run in an isolated eight-second call
   before research; a failure never blocks a trace and never changes the score.
6. **Score** — `src/lib/scoring.ts` produces the status and Smoke Score from the
   surviving evidence.

Processing happens in bounded, awaited server stages with a durable database
lease, not a background task. If a trace is interrupted, the page offers
**Resume trace**.

## What is not in this repo

- **Secrets** — the You.com key, the OpenCrawl key and the AI gateway key live in
  Lovable Secrets. They are never committed and never sent to the browser.
- **Saved traces, watchlists and evidence rows** — these live in the backend
  database, which is shared with the deployed app. A local clone does not carry
  them.
- **Schema changes** — do not hand-edit `drizzle/migrations/` or
  `supabase/migrations/`. Ask for the schema change instead.

## Working on the design

If you are here to change how it looks and feels, start with
[CONTRIBUTING.md](CONTRIBUTING.md). Short version: colors, fonts and shadows are
tokens in `src/styles.css`, and the status colors carry meaning — a design change
should not quietly change a verdict.
