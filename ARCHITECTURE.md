# TARCOS — Architecture

Current-truth description of how the engine is built. Replaces the earlier narrative "roadmap/presentation" document; the work-log history lives in git history.

## Layering & Import Direction

```
src/types.ts (domain model)
        │
        ▼
data/content ──► data/tuning ──► engine/behaviors ──► engine (core modules) ──► engine/raidSimulation.ts
        │             │                                    │
        └─────────────┴────────────────────────────────────┴──► hooks ──► components
```

- **`src/types.ts`** — the domain model (`GameState`, `PMCCharacter`, `GameItem`, `Weapon`, `Hideout`, …). Imported everywhere; imports nothing.
- **`src/data/content/*`** — static game content (item catalog, maps, weapons, quests, hideout definitions). No logic beyond pure builders.
- **`src/data/tuning/*`** — balance numbers and formulas. **The only place magic numbers live.** Engine modules must never hardcode balance values; changing balance means editing a tuning file, not engine logic.
- **`src/data/construction.ts`** — PMC/hideout factories (`createInitialPMC`, `createInitialHideout`, `calculateBodyParts`, `getWeaponStats`, …). Sits between content/tuning and the engine.
- **`src/engine/*`** — pure simulation modules (no React). Core modules are single-responsibility; `raidSimulation.ts` is the orchestrator.
- **`src/engine/behaviors/*`** — strategy registries (`classPassives`) and the plugin seam (`hideoutModules`).
- **`src/hooks/*`** — React adapters: persistence + save migration (`useGameSave`), passive recovery + tick drainer (`useRaidTick`).
- **`src/components/*`** — view layer; renders state, never mutates it.

## The Raid Tick Pipeline

`runRaidTickGenerator(state)` (`engine/raidSimulation.ts`) is a **synchronous generator** that yields `InterruptHook`s at observable boundaries and returns the next `GameState`:

1. Mutates an **Immer draft** (`createDraft`/`finishDraft`) — the input state is never mutated; the output is a fresh, structurally-shared, frozen reference. No `JSON.parse(JSON.stringify(…))` anywhere.
2. Time advancement + nutrition decay.
3. Hydration status / dehydration KIA → `handleKIA(state, "DEHYDRATION")`.
4. Combat (delegated to `simulateCombatRoundGenerator`, forwarding its `BEFORE_ACTION` / `AFTER_DAMAGE` hooks).
5. Kill handling: tier XP, skill gains, corpse loot, reinforcement or scavenging.
6. Tile exploration: encounter roll → combat, or loot + maintenance.
7. Extraction → `handleExtraction(state)`.
8. Every raid-ending exit emits `AFTER_RAID_END` and dispatches `RAID_END_MODULES` (the `ModuleInstance` plugin seam).

`runRaidTick(state)` is the sync drainer used by tests/goldens; `hooks/useRaidTick.ts` drains the generator directly inside its React updater.

## Intent Settlement & the Kept Seams

`engine/contracts.ts` + `engine/engineContext.ts` implement an intent/telemetry layer that the engine *currently uses lightly* (damage via `DAMAGE` intents, kill XP via `XP`, stage advancement via `POSITION_CHANGE`):

- `emitIntent(intent)` queues an atomic, observable state change.
- `settle()` returns `TickTelemetry` (emitted intents + applied patches).
- `queryEnvironment(query)` is a read-only inspection surface.
- `InterruptHook` / `AFTER_RAID_END` / `ModuleInstance` give external observers and plugins a stepping/interception contract.

These seams are **deliberately kept** even though only tests currently consume `settle()`/`queryEnvironment` — they are the documented extension point for agent control, step-debugging, and additional hideout plugins (the Scavenger Workstation is the one live `ModuleInstance`).

## Conventions & Guardrails

1. **Balance lives in `src/data/tuning/*` only.** No magic numbers in engine conditionals.
2. **Import direction is one-way** (data → engine → UI). Content/tuning must never import engine modules.
3. **No `any`.** If a signature needs a type, define it (e.g. `WeaponStats`).
4. **Immutable state.** UI handlers and the tick loop mutate Immer drafts; catalogs are copied with `structuredClone` before instances are given out.
5. **Single source of truth.** Algorithms that could plausibly be duplicated (container sorting, KIA processing, body-part order, medical backup search) exist once and are imported.
6. **Tests prove behavior.** `npm run lint` (tsc) + `npm test` must pass; do not declare work done otherwise.
7. **`dist/index.html` is committed manually.** Rebuilds are an explicit, separate step; refactors leave it untouched.
8. **Micro-diffs.** One logical change per commit.

## Test Strategy

- **Unit/contract tests** live next to their module (`*.test.ts`): tuning contracts (`data/tuning/*.test.ts`), pure engine functions (`engineContext`, `lootManagement`, `hideoutModules`, …).
- **Characterization (golden master)** — `engine/characterization/goldenHarness.ts` drives `runRaidTick` under a seeded PRNG and snapshots full transcripts into `engine/__golden__/scenario-*.json`. **These snapshots freeze behavior**; they must pass unchanged unless a behavior change is intentional (then regenerate with `vitest run -u` and say so in the commit).
- Behavioral parity across the generator/tick refactors is enforced by these goldens.

## Open Refactor Items

These couplings remain and are intentionally deferred (behavior-preserving rewrites, larger risk):

- **Quests**: `Quest.type`/`trader` are string unions; dispatch is a hardcoded `if` chain in `progression.ts`; the `target === "no_medkit"` find-quest is a magic string with no contract test.
- **Classes**: passives are extracted, but `ClassType` still leaks into components (`ProgressionScreen` per-class HP chain, `RaidScreen` SCOUT dodge); `CLASS_PASSIVES`, `ARCHETYPE_WEIGHTS`, `INITIAL_WEAPONS` are separate per-class tables that could be one registry.
- **Hideout**: only the Scavenger Workstation uses the `ModuleInstance` seam; medstation/workbench/intel/range/nutrition effects are still hand-wired in `raidSimulation.ts`, `combat.ts`, and `data/construction.ts`.
- **Narratives**: log strings are hardcoded in engine modules; there is no event/localization layer.
