# T.A.R.C.O.S: Tactical Armed Roguelike Combat Observation Simulator

A browser-based, zero-player auto-battler roguelike inspired by *Escape from Tarkov*. The player never directly controls the PMC during raids — the game simulates autonomous combat, looting, healing, and navigation in real-time. Your role is strategic preparation: equipping weapons, managing stash, upgrading the hideout, and selecting deployment zones.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict, ES2022) |
| UI | React 19 |
| State mutation | Immer (copy-on-write drafts, never `JSON.parse(JSON.stringify(…))`) |
| Build | Vite 6 (single-file output via `vite-plugin-singlefile`) |
| Styling | Tailwind CSS v4 |
| Animations | Motion |
| Icons | Lucide React |
| Testing | Vitest (unit + contract + golden-master snapshots) |
| Persistence | Browser `localStorage` |

## Run Locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

> **Note:** All game progress is persisted in browser `localStorage` (key: `tarkov_zero_player_state_v1`). If you update the code and encounter broken behavior, clear this key via DevTools → Application → Local Storage to reset the save.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build — outputs a single-file `dist/index.html` that runs standalone |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type check (`tsc --noEmit`) — not a style linter |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

> **Note on `dist/`:** `dist/index.html` is a **tracked** single-file build artifact. It is rebuilt only when the user explicitly runs `npm run build` and commits it manually — refactors generally should NOT rebuild it.

## Project Structure

```
src/
├── main.tsx                    # React DOM entry
├── App.tsx                     # Root state orchestrator (UI handlers, Immer `produce`)
├── types.ts                    # Domain model: GameState, PMCCharacter, GameItem, Weapon, …
├── engine/                     # Pure simulation engine (no React imports)
│   ├── contracts.ts            # Engine contract types (EngineContext, IntentPayload, KIAReason, …)
│   ├── engineContext.ts        # Intent settlement reducer + per-tick runtime adapter
│   ├── combat.ts               # Combat round generator (yields InterruptHooks)
│   ├── raidSimulation.ts       # Raid tick generator + sync drainer (runRaidTick)
│   ├── raidResolution.ts       # handleKIA / handleExtraction — single death & extraction pipeline
│   ├── loot.ts                 # Loot rolling, backpack capacity, executeLootPhase
│   ├── lootManagement.ts       # sortLootIntoContainers (backpack + secure container)
│   ├── maintenance.ts          # Healing, surgery, provisions
│   ├── progression.ts          # XP, quest finalization, skill gains
│   ├── spawning.ts             # Enemy generation (profile-driven)
│   ├── bodyParts.ts            # Shared body-part order constants
│   ├── utils.ts                # createLog
│   ├── behaviors/              # Strategy registries + plugin seam
│   │   ├── classPassives.ts    # Class passive lookups (sourced from tuning)
│   │   └── hideoutModules.ts   # ModuleInstance registry + AFTER_RAID_END dispatch
│   └── characterization/       # Golden-master regression harness (seeded PRNG)
│       ├── goldenHarness.ts
│       └── goldenMaster.test.ts
├── data/
│   ├── construction.ts         # PMC / hideout factories + getWeaponStats (was src/data.ts)
│   ├── content/                # Static game content
│   │   ├── items.ts            # ALL_ITEMS catalog
│   │   ├── maps.ts             # Map templates + procedural map builder
│   │   ├── weapons.ts          # Starting weapon per class
│   │   ├── quests.ts           # Quest pool
│   │   └── hideout.ts          # Hideout module definitions
│   └── tuning/                 # Balance numbers — the ONLY place magic numbers live
│       ├── raidConfig.ts       # Tick timing, decay, hydration status bands
│       ├── combatConfig.ts     # Accuracy, ballistics, armor, bleed, dodge
│       ├── combatBalance.ts    # Per-class passive config
│       ├── enemySpawning.ts    # Enemy tier profiles
│       ├── medicalConfig.ts    # Backup-item search, heal costs
│       ├── lootConfig.ts       # Rarity weights, loot chance/rolls, capacity
│       ├── progressionConfig.ts# XP formula, intel multipliers, quest pool
│       └── hideoutConfig.ts    # Module effect scaling (secure container, medstation, …)
├── hooks/
│   ├── useGameSave.ts          # localStorage persistence + legacy save-schema migration
│   └── useRaidTick.ts          # Passive recovery loop + raid tick drainer
└── components/
    ├── RaidScreen.tsx          # Raid monitor & deployment UI
    ├── StashScreen.tsx         # Inventory, market, vitals
    ├── WeaponModding.tsx       # Weapon modification bench
    ├── ProgressionScreen.tsx   # Hideout, skills, class selection
    └── BodyMap.tsx             # 7-zone body part HP visualization
```

## Design & Architecture

- **Game design**: see [DESIGN.md](DESIGN.md).
- **Architecture** (engine layering, tick pipeline, conventions/guardrails, open refactors): see [ARCHITECTURE.md](ARCHITECTURE.md).
- **Conventions for AI-assisted development**: see [AGENTS.md](AGENTS.md).
