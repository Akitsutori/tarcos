# T.A.R.C.O.S: Tactical Armed Roguelike Combat Observation Simulator

A browser-based, zero-player auto-battler roguelike inspired by *Escape from Tarkov*. The player never directly controls the PMC during raids — the game simulates autonomous combat, looting, healing, and navigation in real-time. Your role is strategic preparation: equipping weapons, managing stash, upgrading the hideout, and selecting deployment zones.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict, ES2022) |
| UI | React 19 |
| Build | Vite 6.2 |
| Styling | Tailwind CSS v4 |
| Animations | Motion (Framer Motion successor) |
| Icons | Lucide React |
| Testing | Vitest |
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
| `npm run build` | Production build — outputs a standalone `dist/` folder (open `dist/index.html` directly or serve statically) |
| `npm run lint` | TypeScript type check |
| `npm test` | Run tests (single run) |
| `npm run test:watch` | Run tests (watch mode) |

## Project Structure

```
src/
├── main.tsx                    # React DOM entry
├── index.css                   # Global styles
├── App.tsx                     # Root state orchestrator
├── types.ts                    # TypeScript interfaces & enums
├── data.ts                     # Static game database
├── gameEngine.ts               # Barrel re-export for engine modules
├── engine/                     # Simulation engine (decomposed)
│   ├── combat.ts               # Combat resolution
│   ├── raidSimulation.ts       # Raid tick orchestrator
│   ├── maintenance.ts          # Healing, surgery, provisions
│   ├── spawning.ts             # Enemy generation
│   ├── loot.ts                 # Loot rolling & backpack
│   ├── progression.ts          # XP, quests, skill gains
│   └── utils.ts                # Shared helpers
├── hooks/                      # React custom hooks
│   ├── useGameSave.ts          # localStorage persistence & legacy backfill
│   └── useRaidTick.ts          # Passive recovery & raid tick timers
└── components/
    ├── RaidScreen.tsx           # Raid monitor & deployment UI
    ├── StashScreen.tsx          # Inventory, market, vitals
    ├── WeaponModding.tsx        # Weapon modification bench
    ├── ProgressionScreen.tsx    # Hideout, skills, class selection
    └── BodyMap.tsx              # 7-zone body part HP visualization
```

## Game Design

See [DESIGN.md](DESIGN.md) for the complete game design document (reverse-engineered from source).
