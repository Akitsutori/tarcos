# TARCOS UI: Design Tokens & Agent Playbook

The UI is token-driven so a layout change is a **single-number edit** in
`src/index.css` — no render loop required. Two layers enforce that nothing
regresses:

1. `src/ui/guard.test.ts` — a deterministic source lint (runs with `npm test`).
2. `npm run ui:check` — a real-DOM overflow scan via Playwright (system Edge).

## The single-number levers

Everything lives in the `@theme` block of `src/index.css`.

| Token | Meaning | Typical edit |
|---|---|---|
| `--chrome-height` | header + tab nav + main padding + footer | **Bump it** if the App chrome grows |
| `--item-grid-cols` | stash item grid column count | `2` → `3` if cards get roomier |
| `--radius-card` / `--radius-control` | panel / control radii | corner sharpness |
| `--text-*` | semantic type scale (`text-label` … `text-stat`) | font sizing |
| `--color-*` | semantic palette (never raw `slate-*`/hex) | palette shift |
| `h-app-viewport` (utility) | `calc(100dvh - var(--chrome-height))` | the single source for "fits under the chrome" |
| `grid-cols-items` (utility) | `repeat(var(--item-grid-cols), minmax(0, 1fr))` | token-driven column count |

**The app-viewport contract** (this is the anti-regression core):
`#stash-screen` is `flex flex-col lg:h-app-viewport lg:overflow-hidden`. Its
two children are the stat strip (`shrink-0`) and the main grid
(`lg:flex-1 lg:min-h-0` with `lg:grid-rows-[minmax(0,1fr)]`). That row
constraint is mandatory — an implicit `auto` grid row grows to content and
the page starts scrolling again. All overflow lives inside the two bounded
columns, which scroll internally. The page never scrolls; the weapons vault
can never sit under the footer.

## Primitives (`src/ui/*`)

`Card`, `PanelHeader`, `Button`, `Badge`, `DurabilityBar`, `StatChip`,
`SectionLabel`, `ScrollPane`. Styled purely from tokens. `Card` accepts an
`id` for harness hooks. `Button` has `whitespace-nowrap shrink-0` built in —
do not re-add wrapper classes to un-break buttons.

## Rules the guard enforces (`npm test`)

For every `.tsx` under `src/` **not** in the `LEGACY` allowlist
(`App.tsx`, `BodyMap`, `RaidScreen`, `ProgressionScreen`, `WeaponModding`):

- no `text-[Npx]` arbitrary font sizes — use the `text-*` scale
- no `calc(100vh …)` hardcoded viewports — use `h-app-viewport`
- no raw hex color literals — use the `--color-*` tokens
- `src/ui/*` never imports from `components`/`engine`/`hooks`

The allowlist **fails if an entry goes clean while still listed** — when you
migrate a screen, delete its entry in the same commit (see below).

## Visual verification (`npm run ui:check`)

Boots Vite on port 3100, drives the app in headless Edge, opens the Stash
tab, and asserts at 1920×1080 and 2560×1440:

- page never scrolls (horizontally or vertically)
- no clipped/spilling elements inside `#stash-screen`
- sidebar bounded on screen (footer can't overlap the vault)
- category bar is one line
- item grid renders the token column count
- at 1440p the sidebar fits with ≤ 8px of internal scroll

Requires Playwright (`playwright-core`) and either Edge or Chrome on the
machine — no browser download. Exit 0 = clean.

## Migrating a legacy screen

1. Rebuild the screen on `src/ui/*` primitives + tokens.
2. Delete its entry from `LEGACY` in `src/ui/guard.test.ts`.
3. Run `npm run lint && npm test && npm run ui:check`.
4. If the screen has an app-viewport grid, copy the stash contract above
   (`lg:h-app-viewport` + `lg:grid-rows-[minmax(0,1fr)]`).

**Never** rebuild `dist/index.html` as part of a UI refactor.
