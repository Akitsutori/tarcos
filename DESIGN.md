# TARCOS — Game Design Reference

Concise game rules for developers. See `ARCHITECTURE.md` for how these are implemented, and `src/data/tuning/*` for the actual balance numbers.

## Core Loop

The player never controls the PMC mid-raid. Instead:

1. **Prepare** — pick a class (new game), equip weapons/armor/medicals, buy items, upgrade hideout modules, accept quests.
2. **Deploy** — choose a map. The raid runs autonomously tick-by-tick.
3. **Observe** — watch raid logs, combat rounds, loot finds, and vitals; adjust speed (1x/2x/5x).
4. **Resolve** — the raid ends in **extraction** (survive) or **KIA** (death). Rewards feed XP, quests, and the hideout.
5. **Upgrade** — reinvest Roubles + barter items into the hideout, then repeat.

## PMC

### Classes

| Class | Identity | Passive |
|---|---|---|
| SOLDIER | Balanced frontline | +20% damage dealt, −15% damage taken |
| SURVIVOR | Resilient | Free reload (replaces a fire action) |
| MARKSMAN | Long-range | None (baseline) |
| SCOUT | Mobile | SMG burst range 3–7, +SMG penetration, 2.0× dodge |
| LUCKY | Fortune | 15% chance to survive fatal damage, +1 loot roll, upgraded starting armor |

### Body Parts (7 zones)

`head`, `thorax`, `stomach`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`.

- Base HP: head/thorax = `15 + 3·constitution`, all others = `15 + 1·constitution`.
- **Fatal zones: head and thorax.** If either reaches 0 HP the PMC (or enemy) dies.
- Damage to arms/legs spills over to neighboring zones; stomach damage is lethal-adjacent (it bleeds into fatal zones via spillover).

### Vitals

- **Energy / Hydration** (0–100). Decay during raids (reduced by Constitution skill and the Nutrition Unit). Hydration at 0 is **fatal** (dehydration KIA).
- **Bleeding** — applies periodic HP loss until healed with a medkit.
- **Cover** — a defensive stance that reduces incoming accuracy while active.

### Skills (5)

`weaponSkill`, `constitution`, `perception`, `initiative`, `agility` — start at level 5 and gain XP from actions (weapon skill from kills, etc.). Starting allocation uses per-class archetype weights. Constitution raises HP; perception raises loot chance; initiative decides combat order; agility raises dodge.

### Equipment Slots

- **Weapon** (with attachable mods: sight, suppressor, grip, magazine, stock, handguard).
- **Armor** (armor class + durability; blocks or penetrates bullets).
- **Helmet** (protects the head).
- **Medkit** (stops bleeding / heals), **Surgical kit** (repairs blacked/bleeding limbs), **Provision** (food/water).

## Hideout (6 modules)

| Module | Effect |
|---|---|
| Medstation | Heals HP out of raid (every 5 s, level-scaled) |
| Workbench | Weapon ergonomics/recoil bonuses (compounding per level) |
| Intelligence Center | Secure-container capacity (4 → 6 → 9) + XP multipliers |
| Shooting Range | Accuracy bonus during combat |
| Nutrition Unit | Out-of-raid energy/hydration recovery |
| Scavenger Workstation | Per-extraction loot reward (level-scaled, raid-count cooldown) |

Modules upgrade with Roubles + barter items. Module effects are the reference implementation of the `ModuleInstance` plugin seam.

## Combat

- Round-based: an initiative roll decides who acts first.
- Accuracy = weapon accuracy × skill weight ± cover/hydration penalties.
- Shots resolve in bursts; each hit rolls **penetration** vs armor class (armor blocks damage or partially passes it while losing durability).
- Hits roll **bleed chance**. Dodge (Scout 2.0×) can avoid hits.
- Winning an encounter grants XP + loot rolls from the corpse (tier-scaled).

## Loot & Economy

- Raid loot is rolled from the item catalog weighted by rarity, then allocated to the **backpack** (capacity from Constitution) and the **secure container** (capacity from Intelligence Center; items there are kept even on KIA).
- Roubles buy items from traders; barter items upgrade the hideout.

## Quests

Trader quests (`prapor`, `therapist`, `ragman`) of types Kill / Extract / Find / Collect / Valuables. Completed quests grant XP and rotate out of the pool.

## Maps & Enemies

- Maps (e.g. Factory) define stages/tiles, spawn chances, boss, and loot multiplier.
- Enemy tiers: **Scav** (weak), **PMC** (medium), **Boss** (strong, tier-scaled XP).
- Tiles are procedurally generated from templates; each tile may host an encounter or loot.

## Persistence

Everything is saved to `localStorage` under `tarkov_zero_player_state_v1` (see `hooks/useGameSave.ts`, which also migrates legacy save shapes).
