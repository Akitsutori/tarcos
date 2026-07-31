# AGENTS.md — Project Instructions for Coding Agents

Instructions for AI coding assistants (and humans) working on TARCOS.

## Commands

| Task | Command |
|---|---|
| Type check (the project's "lint") | `npm run lint` (`tsc --noEmit`) |
| Run all tests | `npm test` |
| Watch tests | `npm run test:watch` |
| Dev server | `npm run dev` |
| Production build | `npm run build` (rebuilds `dist/index.html`) |

A task is **not done** until `npm run lint` and `npm test` both pass.

## Code Map

- **Domain types** — `src/types.ts` (single source of truth for `GameState`, `PMCCharacter`, `GameItem`, …).
- **Game content** (items, maps, weapons, quests, hideout defs) — `src/data/content/*`.
- **Balance numbers** — `src/data/tuning/*`. This is the ONLY place magic numbers belong. Never hardcode a balance value in an engine module.
- **Construction/factories** (initial PMC, hideout, weapon stats) — `src/data/construction.ts`.
- **Simulation engine** — `src/engine/*`. Pure (no React). The raid tick orchestrator is `engine/raidSimulation.ts`; combat is `engine/combat.ts`; death/extraction pipelines are `engine/raidResolution.ts`.
- **Engine contract types** — `src/engine/contracts.ts` (NOT `src/types.ts`).
- **UI adapters** — `src/hooks/*`; **views** — `src/components/*`.

## Conventions

1. **State is immutable.** Mutate Immer drafts (`produce`, `createDraft`/`finishDraft`). Never `JSON.parse(JSON.stringify(prev))`; use `structuredClone` to copy item catalogs.
2. **No `any`.** Define a type (e.g. `WeaponStats`) instead of widening signatures.
3. **No magic numbers in engine code.** Balance constants must be imported from `src/data/tuning/*`.
4. **Import direction is one-way**: `data → engine → hooks → components`. Content/tuning must never import engine modules.
5. **Don't duplicate algorithms.** `sortLootIntoContainers`, `handleKIA`/`handleExtraction`, body-part order constants (`engine/bodyParts.ts`), and medical backup search are single sources of truth — import them.
6. **Keep the language English** — code, comments, docs.
7. **`dist/index.html` is a tracked artifact committed manually.** Refactors leave it untouched; do not rebuild it unless explicitly asked.

## Golden Rules

- `src/engine/__golden__/scenario-*.json` are **characterization baselines** that freeze `runRaidTick` behavior. They must pass unchanged. Only regenerate (`vitest run -u`) for an intentional behavior change, and call that out in the commit.
- The engine's tick flow is **synchronous generators** (`runRaidTickGenerator`, `simulateCombatRoundGenerator`) drained by wrappers — there is no async variant. Don't reintroduce async wrappers.
- `settle()` / `queryEnvironment` in `engine/engineContext.ts` are intentionally-kept extension seams (agent/step-debugging/hideout plugins), even though only tests currently exercise them — don't delete them as "dead code".
- Persistence: saves live in `localStorage` under `tarkov_zero_player_state_v1`; `hooks/useGameSave.ts` migrates legacy shapes.
- Keep changes small and reviewable (one logical change per commit).
