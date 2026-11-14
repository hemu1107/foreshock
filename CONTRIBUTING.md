# Changing the design

This guide is for someone editing how Fourshock looks and feels without touching
what it decides.

## Start here

| Want to change | Open |
| --- | --- |
| Colors, fonts, radii, shadows, status palette | `src/styles.css` (tokens are at the top, inside `@theme inline`) |
| Page structure of the home screen | `src/routes/index.tsx` |
| Trace result layout | `src/routes/trace.$id.tsx` |
| Nav, footer, shared page chrome | `src/components/smoke/workspace.tsx` |
| Verdict card, status badge, spread map, evidence table | `src/components/smoke/evidence.tsx` |
| Signal stack (the weak-signal bars) | `src/components/smoke/signals.tsx` |
| Ledger precedents card | `src/components/smoke/precedents.tsx` |
| Saved-trace list and search | `src/components/smoke/trace-library.tsx` |
| Empty, loading and error screens | `src/components/smoke/state.tsx` |

Reusable primitives (button, card, badge, dialog, tabs…) are in
`src/components/ui/`. Prefer composing those over new one-off markup.

## Design tokens

Everything visual is defined once in `src/styles.css`:

- **Type** — `--font-sans` (Inter), `--font-serif` (Instrument Serif), `--font-mono`
  (JetBrains Mono). Fonts load from a `<link>` in `src/routes/__root.tsx`, not
  from a CSS `@import`.
- **Surface** — `--background`, `--card`, `--secondary`, `--border`,
  `--muted-foreground`.
- **Action** — `--primary` (teal), `--accent`; shared `--gradient-*` tokens provide the signal-inspired theme.
- **Status** — `--whisper`, `--rumor`, `--corroborated`, `--confirmed`,
  `--denied`, `--cold`, each with a darker `-ink` variant for text on light
  backgrounds.
- **Radius** — use the shared radius tokens. **Focus** — `--shadow-focus`.

Use the token, never a literal: `text-foreground`, `bg-card`,
`border-border`, `text-confirmed`. Hardcoded values like `text-white`,
`bg-black` or `bg-[#...]` bypass theming and break the states that depend on
status color.

## Rules that keep the tool trustworthy

1. **Do not change a verdict with a design change.** Status and Evidence Score come
   from `src/lib/scoring.ts` and the rules in `src/lib/official.ts`. Visual work
   should not edit those files. If a label or scale needs to change, that is a
   product decision — raise it.
2. **Status colors mean specific things.** `confirmed` is green, `denied` is
   red, `cold` is grey-blue. Keep them distinct from each other and from the
   teal action color, and keep the `-ink` variants for text so contrast holds.
3. **Accessibility is part of the design.** Visible keyboard focus
   (`:focus-visible` and `--shadow-focus`), the skip link, `aria-label`s on
   controls, and the `prefers-reduced-motion` rule in `src/styles.css` all stay
   working. Any new animation must also be disabled under reduced motion.
4. **Layouts hold at three widths.** 1280px laptop, 1000px tablet, 640px phone
   (see the `@media` blocks in `src/styles.css`). Check all three before
   finishing.
5. **Empty, loading and error states are designed, not default.** New screens
   use `WorkspaceState` from `src/components/smoke/state.tsx` rather than a bare
   spinner or a blank panel.

## Before you push

```sh
npm run lint
npm run test
npm run dev
```

The tests cover the rules behind the UI — scoring, official-source detection,
echo detection, spread layout, brief export. If one of them fails after a visual
change, the change reached into logic it shouldn't have.

## Syncing with Lovable

This repository is the synced branch of a Lovable project. Push to the synced
branch and the change appears in the Lovable editor; work Lovable does appears
here. Keep the branch working — it is someone else's live preview. Avoid two
people editing the same file at the same time, and merge any side branch into
the synced branch before it will show up in the editor.
