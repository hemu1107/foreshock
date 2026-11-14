<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Execute external provider calls only in server-only helpers behind validated same-origin server functions; never ship API credentials to the browser.
- Centralize rumor types, registrable-domain classification and deterministic scoring in `src/lib`; the future backend must reuse these rules.
- Keep fictional samples isolated in the React provider and persist live traces in Cloud; sample mode must never call external providers.
- Use dedicated TanStack content routes and shared evidence components; each content route owns its metadata.

- Process live jobs in bounded, awaited stage calls with durable database leases and idempotent source insertion; this avoids unreliable unawaited Worker tasks and duplicate AI fan-out.
- Use the user-selected Gemini 4 Argon chat-completions model for structured source classification; preserve its selection during unrelated changes.
- Keep export source numbering and deterministic spread-map layout in browser-safe presentation helpers so exports and evidence views agree without changing scoring.
- Track freshness per completed check in the workspace session; database reads alone never make an old trace fresh.
