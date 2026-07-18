# Escape from Tarkov: Zero-Player Roguelike

## Complete Game Design Document (Reverse-Engineered from Source)

> **Version:** 1.0 — Extracted from codebase analysis, July 2026
> **License:** Apache-2.0
> **Status:** Functional prototype, fully client-side

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Concept](#2-core-concept)
3. [Character Classes](#3-character-classes)
4. [Combat System](#4-combat-system)
5. [Body Part Health Model](#5-body-part-health-model)
6. [Maps & Procedural Generation](#6-maps--procedural-generation)
7. [Enemy Types](#7-enemy-types)
8. [Loot System](#8-loot-system)
9. [Hydration & Energy](#9-hydration--energy)
10. [RPG Skills](#10-rpg-skills)
11. [Weapon Modding](#11-weapon-modding)
12. [Hideout System](#12-hideout-system)
13. [Quest System](#13-quest-system)
14. [Economy](#14-economy)
15. [Extraction & Death](#15-extraction--death)
16. [Game Loop](#16-game-loop)
17. [Architecture](#17-architecture)
18. [Data Structures](#18-data-structures)
19. [Source File Map](#19-source-file-map)

---

## 1. Project Overview

### 1.1 Summary

A browser-based, zero-player auto-battler roguelike inspired by *Escape from Tarkov*. The player **never directly controls** the PMC during raids. Instead, the game simulates autonomous PMC behavior — combat, looting, healing, navigation — in real-time. The player's role is strategic preparation: equipping weapons, managing stash, upgrading hideout, and selecting deployment zones.

### 1.2 Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict, ES2022 target) |
| UI Framework | React 19 (JSX/TSX) |
| Build Tool | Vite 6.2 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animations | Motion (Framer Motion successor, `motion/react`) |
| Icons | Lucide React |
| Testing | Vitest |
| Persistence | Browser `localStorage` |
| Fonts | Inter (sans), JetBrains Mono (mono) |

### 1.3 Project Structure

```
src/
├── main.tsx                    # React DOM entry point
├── index.css                   # Global styles (Tailwind + fonts)
├── App.tsx                     # Root orchestrator, state management
├── types.ts                    # All TypeScript type definitions
├── data.ts                     # Static game database & factory functions
├── gameEngine.ts               # Barrel re-export for engine modules
├── gameEngine.test.ts          # Vitest smoke tests
├── engine/                     # Simulation engine (decomposed)
│   ├── combat.ts               # Combat resolution
│   ├── raidSimulation.ts       # Raid tick orchestrator
│   ├── maintenance.ts          # Healing, surgery, provisions
│   ├── spawning.ts             # Enemy generation by tier
│   ├── loot.ts                 # Loot rolling & backpack capacity
│   ├── progression.ts          # XP, quests, skill gains
│   └── utils.ts                # Shared helpers (createLog)
├── hooks/                      # React custom hooks
│   ├── useGameSave.ts          # localStorage persistence & legacy backfill
│   └── useRaidTick.ts          # Passive recovery & raid tick timers
└── components/
    ├── RaidScreen.tsx           # Raid deployment & monitoring UI
    ├── StashScreen.tsx          # Inventory, market, vitals monitor
    ├── WeaponModding.tsx        # Weapon modification bench
    ├── ProgressionScreen.tsx    # Hideout, skills, class selection
    └── BodyMap.tsx              # 7-zone body part HP visualization
```

### 1.4 Source File Sizes

| File | Lines | Responsibility |
|---|---|---|
| `App.tsx` | 531 | Root state orchestrator, event handlers |
| `engine/combat.ts` | 283 | Combat resolution, damage, armor penetration |
| `engine/raidSimulation.ts` | 281 | Raid tick processor, stage orchestration |
| `engine/maintenance.ts` | 145 | Healing, surgery, provisions, ammo reload |
| `engine/spawning.ts` | 143 | Enemy generation by tier and map |
| `engine/loot.ts` | 120 | Loot rolling, backpack capacity |
| `engine/progression.ts` | 85 | XP awards, quest completion, skill gains |
| `engine/utils.ts` | 20 | Shared helpers (createLog) |
| `gameEngine.ts` | 7 | Barrel re-export for engine modules |
| `hooks/useGameSave.ts` | 161 | localStorage persistence, legacy backfill |
| `hooks/useRaidTick.ts` | 68 | Passive recovery timer, raid tick dispatch |
| `data.ts` | 565 | Static items, weapons, maps, hideout, quests |
| `types.ts` | 243 | All TypeScript interfaces & enums |
| `components/RaidScreen.tsx` | 605 | Raid monitor & deployment UI |
| `components/StashScreen.tsx` | 435 | Inventory, trader shops, vitals monitor |
| `components/ProgressionScreen.tsx` | 327 | Hideout upgrade UI, skills, class selection |
| `components/WeaponModding.tsx` | 241 | Weapon modification bench UI |
| `components/BodyMap.tsx` | 108 | 7-zone body part HP visualization |
| `main.tsx` | 9 | React DOM entry point |

---

## 2. Core Concept

### 2.1 The Zero-Player Loop

The game operates on a fundamental split between **preparation** (player-controlled) and **execution** (AI-controlled):

```
PREPARATION (Player)              EXECUTION (Engine)
─────────────────────            ──────────────────────
• Select character class          • Autonomous movement
• Equip & mod weapons              • Initiative-based combat
• Manage stash & provisions       • Looting & scavenging
• Upgrade hideout modules          • Healing & maintenance
• Choose deployment map            • Navigation & extraction
• Monitor raid via terminal logs   • Hydration/energy decay
```

### 2.2 Simulation Philosophy

- **No direct control**: The PMC acts autonomously based on weighted RNG decisions
- **Terminal-style log feed**: The player watches events unfold as a real-time log
- **Strategic depth over tactical**: Success depends on preparation, not reflexes
- **Roguelike elements**: Procedural maps, permadeath (loot loss), persistent progression

---

## 3. Character Classes

### 3.1 Overview

5 distinct archetypes, each with a signature weapon and unique passive ability:

| Class | Signature Weapon | Caliber | Passive Ability |
|---|---|---|---|
| **Soldier** | Assault Rifle | 7.62x39mm | +20% damage dealt, -15% damage received |
| **Survivor** | Shotgun | 12x70mm | Free reload (reload doesn't end turn) |
| **Marksman** | Marksman Rifle | 7.62x54mm | +25% critical hit chance, +50% crit damage |
| **Scout** | SMG | 9x19mm | Double dodge chance, 3-7 round burst |
| **Lucky** | LMG | 7.62x39mm | +25% rare loot rolls, 15% lethal hit bypass |

### 3.2 Weapon Base Stats

| Class | Weapon | Ergo | Recoil | Dmg | Accuracy | Mag Size | Reserve Mags |
|---|---|---|---|---|---|---|---|
| Soldier | Assault Rifle | 50 | 85 | 50 | 50 | 30 | 3 |
| Scout | SMG | 65 | 45 | 28 | 45 | 30 | 3→4* |
| Survivor | Shotgun | 44 | 105 | 65 | 40 | 6 | 2 |
| Marksman | Marksman Rifle | 35 | 140 | 75 | 70 | 10 | 2 |
| Lucky | LMG | 30 | 120 | 57 | 45 | 45 | 2 |

*Scout SMG: `maxReserveMags` overridden to 4 in initialization code.*

### 3.3 Class Passive Implementation Details

| Passive | Code Reference | Effect |
|---|---|---|
| Soldier Damage | `gameEngine.ts:652-656` | PMC dealing damage: `*1.20`; Enemy dealing damage to PMC: `*0.85` |
| Survivor Free Reload | `gameEngine.ts:474-479` | After reload, action changes from `"reload"` to `"fire"` (same turn) |
| Marksman Crit | `gameEngine.ts` (via `critBonus` on weapon mods + Shooting Range) | Stacks with weapon mod crit bonuses |
| Scout Double Dodge | `gameEngine.ts:591` | `dodgeMult = 2.0` when defender is Scout class |
| Lucky Loot Bonus | `gameEngine.ts:845` | `luckBonus = 25` applied to `rollLootItem()` calls |
| Lucky Death Bypass | `gameEngine.ts:713-716` | 15% chance: `head/thorax` set to 1 instead of 0 on fatal hit |

### 3.4 Starting Equipment

All classes start with:
- Class signature weapon (fully loaded)
- 6B13 M body armor (Class 4, 50 durability) — Lucky gets 6B23-1 (Class 3, 45 dur)
- SSh-68 helmet (Class 3, 30 durability)
- AI-2 Medkit (100 HP heal capacity)
- CMS Kit (5 surgical uses)
- Water Bottle (25 hydration)

Starting inventory items:
- 4x AI-2 Medkit
- 2x IFAK
- 3x Water Bottle
- 4x Bolts, 4x Nuts, 2x CPU Fan, 2x Spark Plug, 1x Hose
- 1x Surgical Kit
- ₽120,000 Roubles

---

## 4. Combat System

### 4.1 Combat Flow

Combat runs per-tick within the simulation engine (`simulateCombatRound()` in `gameEngine.ts:342-732`):

```
┌─────────────────────────────────────────────┐
│ COMBAT ROUND RESOLUTION                      │
├─────────────────────────────────────────────┤
│ 1. Initiative Roll                           │
│ 2. For each actor (faster first):            │
│    a. Bleed Phase (if bleeding)              │
│    b. Action Selection (priority-based)      │
│    c. Execute Action                         │
│    d. Death Check (Head/Thorax = 0)          │
│ 3. Repeat until one side dies or flees       │
└─────────────────────────────────────────────┘
```

### 4.2 Initiative Roll

```
Initiative = d20 + Initiative_Skill_Level
```

- Actor with higher total acts first
- Ties: PMC acts first (`>=` check at `gameEngine.ts:351`)

### 4.3 Action Priority

| Priority | Action | Trigger |
|---|---|---|
| 1 (Forced) | **Reload** | Magazine empty + reserve mags available |
| 2 | **Flee** | Magazine empty + no reserves, 30% + Agility×2% chance |
| 3 | **Cover** | 40% chance if not already in cover |
| 4 | **Fire** | Default action |

**Cover mechanics:**
- Taking cover: `-20 accuracy` on attackers targeting this actor
- Stepping out of cover: 50% chance per turn to break cover and fire
- Cover is per-actor: PMC and enemy track independently

**Flee mechanics:**
```
fleeChance = 0.30 + Agility_Level × 0.02
```
- If flee succeeds: combat ends, tile advances without loot
- If flee fails: actor waits (exposed, no action)

### 4.4 Burst Fire

```
Standard:    1-5 rounds per burst (random)
Scout SMG:   3-7 rounds per burst (overrides standard)

burstCount = random(minBurst, min(currentMagRounds, maxBurst))
```

Each bullet in the burst is resolved independently.

### 4.5 Accuracy Calculation

```
finalAccuracy = clamp(5, 95, 
    baseAccuracy 
  + weaponStats.accuracy × 0.5 
  + weaponSkill × 1.0 
  - burstDecay 
  - coverPenalty 
  - hydrationPenalty
)
```

| Component | PMC Value | Enemy Value |
|---|---|---|
| `baseAccuracy` | 30 | 30 (Scav/PMC), 40 (Boss) |
| `weaponStats.accuracy` | Computed from weapon + mods + Workbench | `getWeaponStats(weapon, 0)` |
| `weaponSkill` | PMC's Weapon Skill level | Enemy's Weapon Skill level |
| `burstDecay` | `bulletIndex × 2.5` | `bulletIndex × 3.0` |
| `coverPenalty` | 20 (if target is in cover) | 20 (if PMC is in cover) |
| `hydrationPenalty` | 5 (hydration < 50), 10 (hydration < 25) | N/A (applies to PMC attacker only) |

### 4.6 Dodge Check

```
dodgeChance = agility × 0.0025 × dodgeMult
```

| Variable | Value |
|---|---|
| `dodgeMult` | 1.0 (normal), 2.0 (defender is Scout) |
| `agility` | Defender's Agility skill level |

### 4.7 Body Part Targeting

Each bullet hits a **randomly selected** body part with equal probability:

```
targetedPart = random choice from [head, thorax, stomach, leftArm, rightArm, leftLeg, rightLeg]
```

1/7 chance per body part.

### 4.8 Armor Penetration

```
effectiveArmor = armorClass × (durability / maxDurability)
penThreshold = effectiveArmor × 10

if bulletPen < penThreshold:
    BLOCKED: damage × 0.20, armor durability -5
else:
    PENETRATED: damage × 0.60, armor durability -10
```

**Armor protection zones:**
- Head: protected by helmet
- Thorax, Stomach, Arms: protected by body armor (varies by armor type)
- Legs: typically unprotected

### 4.9 Bullet Penetration by Caliber

| Caliber | Ammo Type | Pen Value |
|---|---|---|
| 7.62x39mm | PS | 34 |
| 9x19mm | PBP (Scout) | 32 |
| 9x19mm | Pst (non-Scout) | 20 |
| 12x70mm | Slug | 18 |
| 7.62x54mm | SNB | 45 |
| 9x18mm | PM | 15 |
| Default | — | 20 |

### 4.10 Damage Application

```
bulletDmg = floor(baseWeaponDmg × dmgMultiplier)

# Soldier modifier:
if PMC is Soldier: bulletDmg = floor(bulletDmg × 1.20)
if Enemy hitting Soldier PMC: bulletDmg = floor(bulletDmg × 0.85)
```

**Thorax overflow spillover** (`gameEngine.ts:664-678`):
If Thorax reaches 0, overflow damage cascades to: Stomach → Left Arm → Right Arm → Left Leg → Right Leg.

### 4.11 Bleeding

```
bleedChance = 35% - constitutionLevel × 1.0%
bleedChance = max(5%, bleedChance)
```

**Additional modifiers:**
- +10% if PMC hydration < 25%
- +5% if PMC hydration < 50%

**Bleed damage per tick:**
```
bleedDmg = max(1, 5 - floor(constitutionLevel × 0.01))
```

Bleed targets the body part with **highest current HP**.

### 4.12 Reinforcements

After killing an enemy:
```
30% chance → spawn new enemy (max 3 reinforcements per tile)
```

---

## 5. Body Part Health Model

### 5.1 Seven-Zone System

Each character has 7 independently tracked body parts:

| Body Part | HP Formula |
|---|---|
| Head | `15 + 3 × Constitution_Level` |
| Thorax | `15 + 3 × Constitution_Level` |
| Stomach | `15 + 1 × Constitution_Level` |
| Left Arm | `15 + 1 × Constitution_Level` |
| Right Arm | `15 + 1 × Constitution_Level` |
| Left Leg | `15 + 1 × Constitution_Level` |
| Right Leg | `15 + 1 × Constitution_Level` |

### 5.2 Death Conditions

- **Head HP = 0** → Instant death (KIA)
- **Thorax HP = 0** → Instant death (KIA)
- **Fatal dehydration** (Hydration = 0) → Head and Thorax set to 0

### 5.3 Surgical Repair

Blacked-out limbs (HP = 0) are repaired by surgical kits in this order:
```
Stomach → Left Leg → Right Leg → Left Arm → Right Arm
```

Each use restores the limb to **1 HP** and consumes 1 surgical kit use.

### 5.4 Healing Order

Post-combat maintenance heals damaged parts in this priority:
```
Head → Thorax → Stomach → Left Leg → Right Leg → Left Arm → Right Arm
```

Each medkit application restores **25 HP** to the highest-priority damaged part.

---

## 6. Maps & Procedural Generation

### 6.1 Map Specifications

| Map | Difficulty | Tiles | Scav% | PMC% | Boss% | Boss | Loot Mult | Level Req |
|---|---|---|---|---|---|---|---|---|
| Factory | Easy | 15 | 50% | 15% | 10% | Tagilla | 1.0x | 1 |
| Customs | Medium | 17 | 55% | 25% | 15% | Reshala | 1.5x | 3 |
| Woods | Medium | 18 | 45% | 20% | 20% | Shturman | 1.8x | 5 |
| Reserve | Hard | 20 | 60% | 35% | 25% | Glukhar | 2.3x | 8 |
| Streets of Tarkov | Insane | 22 | 65% | 45% | 30% | Kaban | 3.2x | 12 |

### 6.2 Room Templates

6 room types, randomly assigned to tiles:

| Template | Description |
|---|---|
| Factory Floor | Conveyor belts and industrial machinery |
| Offices | Overturned desks and filing cabinets |
| Garage | Oil stains and tool benches |
| Cafeteria | Overturned tables and scattered trays |
| Server Room | Cooled server room with blinking equipment racks |
| Armory | Empty weapon racks |

### 6.3 Procedural Map Generation

```typescript
function buildProceduralMap(mapData): RoomTile[] {
    const tiles = [];
    for (let i = 0; i < mapData.stagesCount; i++) {
        tiles.push(randomTemplate());  // Random from 6 templates
    }
    tiles.push({ type: "extraction" });  // Final tile always extraction
    return tiles;
}
```

Total tile count = `mapData.stagesCount + 1` (extraction zone appended).

### 6.4 Tile Encounter Resolution

Each non-extraction tile has a **25% chance** of spawning a combat encounter:

```
encounterRoll = random()
if encounterRoll < 0.25:
    → COMBAT: Spawn enemy, enter combat state
else:
    → SCAVENGING: 3 loot rolls + maintenance phase
```

---

## 7. Enemy Types

### 7.1 Tier Overview

| Tier | Level | Weapon | Armor | Helmet | Loot Rolls |
|---|---|---|---|---|---|
| **Scav** | PMC_Level - (5 to 15) | 50% Pistol, 50% SMG/SG/AR | 40% PACA (Class 2) | 20% UNTAR/SSh-68 (Class 3) | 1 |
| **PMC** | PMC_Level ± 5 | 75% AR, 25% LMG | 70% 6B13 (Class 4) | 60% Class 4 helmet | 2 |
| **Boss** | PMC_Level + 5 (cap 65) | AR / Marksman / LMG | 100% Class 5 | 100% Class 4-5 | 3 |

### 7.2 Skill Ranges by Tier

| Skill | Scav | PMC | Boss |
|---|---|---|---|
| Initiative | 8-12 | 10-14 | 13-17 |
| Agility | 7-11 | 9-13 | 11-15 |
| Weapon Skill | 1-5 | 11-16 | 15-20 |
| Perception | 7-11 | 9-12 | 11-14 |
| Constitution | 2-5 | 4-7 | 6-9 |

### 7.3 Level Scaling

All enemy skills receive a bonus based on level above 1:

```
levelBonus = floor((level - 1) × 0.15)
finalSkill = rolledValue + levelBonus
```

### 7.4 Enemy Name Pools

| Tier | Names |
|---|---|
| Scav | Bomzh, Gopnik, Tushonka, Ded, Cheeki, Breeki, Serega, Kolya, Morozov |
| PMC | Ghost, Hammer, Viking, Frost, Viper, Raven, Slayer, Sherpa, DormChad |
| Boss | Map-specific: Tagilla, Reshala, Shturman, Glukhar, Kaban |

### 7.5 Boss Armor Pool

| Armor | Class | Durability |
|---|---|---|
| 6B13 M (Killa) | 5 | 80 |
| 6B13 M (Glukhar) | 5 | 90 |

---

## 8. Loot System

### 8.1 Loot Roll Mechanics

- **3 loot rolls per non-combat tile**
- **Base loot chance:** 50%
- **Perception bonus:** +1% per Perception level
- **Lucky class bonus:** +25% (applied as flat bonus to `rollLootItem()`)

```
lootChance = 0.50 + perceptionLevel × 0.01
```

### 8.2 Weighted Loot Table

| Item | Weight | Rarity |
|---|---|---|
| 7.62x39mm PS Box | 10 | common |
| 9x18mm PM Box | 10 | common |
| 5.56x45mm M855 Box | 10 | common |
| 12x70mm Slug Box | 10 | common |
| 7.62x54mm SNB Box | 10 | common |
| AI-2 Medkit | 9 | common |
| IFAK | 8 | rare |
| AFAK | 7 | epic |
| Surgical Kit | 6 | rare |
| CMS Kit | 4 | common |
| Surv12 | 3 | rare |
| Collimator (Red Dot) | 3 | common |
| Holographic Sight | 2 | rare |
| Suppressor | 2 | rare |
| Long Barrel | 3 | common |
| Muzzle Brake | 3 | common |
| Vertical Grip | 3 | common |
| Angled Grip | 3 | common |
| Extended Mag | 2 | rare |
| Precision Stock | 2 | rare |
| Light Stock | 3 | common |
| Tetriz | 2 | epic |
| GP Coin | 2 | rare |
| LEDX | 2 | legendary |
| Golden Pocket Watch | 1 | quest |
| Bronze Pocket Watch | 1 | quest |
| Suspicious Letter | 1 | quest |
| Church Key | 1 | quest |
| Toilet Paper | 1 | quest |
| 6B13 M Armor | 4 | rare |
| Water Bottle | 5 | common |
| Juice Box | 4 | common |
| Energy Drink | 3 | common |

**Total weight: 148**

### 8.3 Backpack Capacity

```
capacity = 9 + floor(sqrt(Constitution_Level × 30))
```

| Constitution | Capacity |
|---|---|
| 5 (base) | 9 + floor(sqrt(150)) = 9 + 12 = 21 |
| 10 | 9 + floor(sqrt(300)) = 9 + 17 = 26 |
| 15 | 9 + floor(sqrt(450)) = 9 + 21 = 30 |
| 20 | 9 + floor(sqrt(600)) = 9 + 24 = 33 |

### 8.4 Secure Container

The secure container automatically holds the **highest-value items** during a raid. Items in the secure container **survive death** (KIA).

| Int Center Level | Container Size |
|---|---|
| 0 | 4 slots |
| 2 | 6 slots (+15% capacity) |
| 3 | 9 slots (Gamma container) |

**Auto-sorting logic** (`gameEngine.ts:859-881`):
1. All loot items are flattened to individual units
2. Sorted by value (descending)
3. Top N items → Secure Container (N = container size)
4. Remaining items → Backpack

### 8.5 Item Rarities

| Rarity | Sell Value Range | Examples |
|---|---|---|
| Common | ₽5-15,000 | AI-2, ammo boxes, basic mods |
| Rare | ₽12,000-45,000 | IFAK, holographic, suppressor |
| Epic | ₽25,000-95,000 | AFAK, thermal scope, Tetriz, Ledger |
| Legendary | ₽50,000-280,000 | LEDX, GPU, Golden Rooster |
| Quest | ₽0 | Pocket watches, keys, letter |

---

## 9. Hydration & Energy

### 9.1 Decay Rates

Hydration and energy decay per simulation tick:

```
# Base drain chance per tick (every 12-20 seconds)
energyDrainChance = 0.25 × drainModifier
hydrationDrainChance = 0.30 × drainModifier

# Drain modifier
rateReduction = nutritionUnit.level >= 3 ? 0.8 : 1.0
skillReduction = max(0.5, 1 - constitutionLevel × 0.015)
drainModifier = rateReduction × skillReduction
```

### 9.2 Fatal Dehydration

```
if hydration <= 0:
    head.current = 0
    thorax.current = 0
    → KIA (death)
```

### 9.3 In-Raid Hydration Drain

During maintenance phase, additional hydration drain:
```
hydrationDrain = random(3, 7)  # 3 to 7 lost per maintenance cycle
```

### 9.4 Auto-Consumption

When hydration drops below 50%:
1. Try equipped provision first
2. Then search backpack for any provision
3. Water Bottle: +25 hydration
4. Juice Box: +20 hydration
5. Energy Drink: +30 hydration

### 9.5 Out-of-Raid Recovery

Passive recovery runs every 5 seconds when not in raid:

| Medstation Level | HP Recovery per 5s |
|---|---|
| 0 | +1 HP |
| 1 | +2 HP |
| 2 | +5 HP |
| 3 | +12 HP |

Nutrition Unit Level 1+: +2 energy and +2 hydration per 5 seconds.

---

## 10. RPG Skills

### 10.1 Skill Definitions

| Skill | Effect Per Level | Training Method |
|---|---|---|
| **Weapon Skill** | +1.0 Accuracy | +15 XP per enemy kill |
| **Constitution** | +3 HP Head/Thorax, +1 HP others | Passive (survival actions) |
| **Perception** | +1% loot chance | +25 XP per extraction |
| **Initiative** | Higher value = act first | Passive (combat participation) |
| **Agility** | +0.25% dodge chance | Passive (combat participation) |

### 10.2 Initial Distribution

All skills start at level 5. 25 additional points are distributed randomly based on class archetype weights:

| Weight | Soldier | Scout | Survivor | Marksman | Lucky |
|---|---|---|---|---|---|
| Weapon Skill | 30 | 20 | 15 | 30 | 20 |
| Constitution | 25 | 15 | 30 | 10 | 20 |
| Perception | 15 | 25 | 20 | 30 | 20 |
| Initiative | 15 | 20 | 15 | 15 | 20 |
| Agility | 15 | 20 | 20 | 15 | 20 |

### 10.3 Level-Up

```
Level_Up_Threshold = currentLevel × 200
```

On level-up:
- 1 random skill point awarded (weighted by class archetype)
- Skill XP: 100 XP per skill level-up

### 10.4 Class Training Multipliers

| Class | Primary Skill (×1.5) | Secondary Skill (×1.2) | Tertiary (×1.0) | Others (×0.8) |
|---|---|---|---|---|
| Soldier | Weapon Skill | Constitution | Initiative | Perception, Agility |
| Survivor | Constitution | Perception | Agility | Weapon Skill, Initiative |
| Marksman | Perception | Initiative | Weapon Skill | Constitution, Agility |
| Scout | Agility | Initiative | Perception | Weapon Skill, Constitution |
| Lucky | Initiative | Perception | Agility | Weapon Skill, Constitution |

---

## 11. Weapon Modding

### 11.1 Mod Slots

| Slot | Category | Available Mods |
|---|---|---|
| Sight | `SIGHT` | Red Dot (+3 ergo), Holographic (+5), 4x Scope (+8, -2 recoil), Thermal (+12, -1) |
| Muzzle | `MUZZLE/SUPPRESSOR` | Suppressor (+2 recoil), Long Barrel (+3 ergo, -1), Muzzle Brake (+2 ergo, +1) |
| Foregrip | `FOREGRIP` | Vertical Grip (+3 recoil), Angled Grip (+2 ergo, +1), Laser Grip (+4 ergo, -1) |
| Magazine | `MAGAZINE` | Extended Mag (+10 rounds), Drum Mag (+30 rounds, -2 recoil) |
| Stock | `STOCK` | Light Stock (+1 recoil), Precision Stock (+3 ergo, +2 recoil), Folded Stock (-5 ergo, -3 recoil) |
| Handguard | `HANDGUARD` | *(Slot defined, no mods implemented)* |

### 11.2 Stat Calculation

```typescript
function getWeaponStats(weapon, workbenchLevel) {
    ergo = weapon.baseErgo + sum(mod.ergoBonus)
    recoil = weapon.baseRecoil - sum(baseRecoil × mod.recoilReduction / 100)
    dmg = weapon.baseDmg + sum(mod.dmgBonus)
    accuracy = min(100, weapon.baseAccuracy + floor(ergo / 5))
    critBonus = sum(mod.critBonus)

    # Workbench bonuses
    if workbenchLevel >= 1: ergo += 5, recoil -= recoil × 0.03
    if workbenchLevel >= 3: ergo += 7, recoil -= recoil × 0.07

    return { ergo: clamp(10, 100), recoil: max(15), dmg, accuracy, critBonus }
}
```

### 11.3 Mod Effects Summary

| Mod | Ergo | Recoil | Dmg | Crit | Rarity | Value |
|---|---|---|---|---|---|---|
| Red Dot Sight | +3 | +1% | — | — | common | ₽8,000 |
| Holographic Sight | +5 | +1% | — | — | rare | ₽12,000 |
| 4x Scope | +8 | -2% | — | — | rare | ₽15,000 |
| Thermal Scope | +12 | -1% | — | — | epic | ₽25,000 |
| Suppressor | — | +2% | — | — | rare | ₽15,000 |
| Long Barrel | +3 | -1% | — | — | common | ₽10,000 |
| Muzzle Brake | +2 | +1% | — | — | common | ₽6,000 |
| Vertical Grip | — | +3% | — | — | common | ₽8,000 |
| Angled Grip | +2 | +1% | — | — | common | ₽7,000 |
| Laser Grip | +4 | -1% | — | — | rare | ₽12,000 |
| Light Stock | — | +1% | — | — | common | ₽6,000 |
| Precision Stock | +3 | +2% | — | — | rare | ₽12,000 |
| Folded Stock | -5 | -3% | — | — | common | ₽5,000 |
| Extended Mag | — | — | — | — | rare | ₽10,000 |
| Drum Mag | — | -2% | — | — | epic | ₽20,000 |

---

## 12. Hideout System

### 12.1 Module Overview

5 modules, each with 3 upgrade levels. All start at level 0.

### 12.2 Medstation

| Level | Bonus | Cost | Barter Items |
|---|---|---|---|
| 1 | Passive HP regen +2 HP/min out of raid | ₽15,000 | 2× Bolts, 2× Nuts |
| 2 | Craft advanced medical +5 HP/min | ₽50,000 | 4× Bolts, 4× Nuts, 2× Hose |
| 3 | Free healing after raid +10 HP/min | ₽120,000 | 4× Hose, 2× Circuit Board, 1× Car Battery |

### 12.3 Workbench

| Level | Bonus | Cost | Barter Items |
|---|---|---|---|
| 1 | +5% Weapon Ergo, -3% Recoil | ₽20,000 | 3× Bolts, 2× Spark Plug |
| 2 | Craft high-tier weapon attachments | ₽65,000 | 4× CPU Fan, 3× Circuit Board, 1× WD-40 |
| 3 | +12% Weapon Ergo, -10% Recoil | ₽180,000 | 5× Circuit Board, 1× GPU, 2× WD-40 |

### 12.4 Intelligence Center

| Level | Bonus | Cost | Barter Items |
|---|---|---|---|
| 1 | +5% Experience gain | ₽30,000 | 2× Circuit Board, 2× CPU Fan |
| 2 | +15% Secure Container, +10% XP | ₽90,000 | 3× CPU, 1× Ledger |
| 3 | +15% Trader payout, 9-slot container | ₽250,000 | 1× GPU, 2× Ledger, 1× Car Battery |

### 12.5 Shooting Range

| Level | Bonus | Cost | Barter Items |
|---|---|---|---|
| 1 | +5% Base weapon damage | ₽180,000 | 5× Bolts, 5× Nuts |
| 2 | +5% Critical hit chance | ₽75,000 | 10× Bolts, 10× Nuts, 1× WD-40 |
| 3 | +15% Weapon Accuracy, +10% Crit Damage | ₽150,000 | 3× Hose, 1× Car Battery |

### 12.6 Nutrition Unit

| Level | Bonus | Cost | Barter Items |
|---|---|---|---|
| 1 | Passive energy/hydration recovery | ₽12,000 | 2× Bolts, 2× Nuts |
| 2 | +25% max Energy/Hydration in raids | ₽45,000 | 2× Hose, 3× CPU Fan |
| 3 | Hunger/Thirst decay 20% slower | ₽110,000 | 1× Fuel Tank, 4× Hose |

---

## 13. Quest System

### 13.1 Overview

- **3 Traders**: Prapor (10 quests), Therapist (7 quests), Ragman (8 quests)
- **Max active quests**: 5
- **Quest refill**: Completed quests are replaced from the pool at extraction
- **Quest progress**: Evaluated only at extraction

### 13.2 Quest Types

| Type | Description |
|---|---|
| Kill | Kill X enemies of specified tier/name |
| Extract | Extract X times (with optional conditions) |
| Find | Find a specific item during a raid |
| Collect | Accumulate X roubles worth of loot value |
| Valuables | Find X valuable-type items |

### 13.3 Quest Database

**Prapor (10 quests):**

| ID | Name | Type | Target | Count | XP |
|---|---|---|---|---|---|
| prapor_01 | Debut | Kill | Scav | 5 | 80 |
| prapor_02 | Counter-Sniper | Kill | PMC | 3 | 150 |
| prapor_03 | Big Score | Kill | Killa | 1 | 300 |
| prapor_04 | Pocket Watch | Find | golden_pocket_watch | 1 | 150 |
| prapor_05 | Bronze Age | Find | bronze_pocket_watch | 1 | 120 |
| prapor_06 | Tissue Issues | Find | toilet_paper | 1 | 300 |
| prapor_07 | Big Game Hunter | Kill | Boss | 1 | 400 |
| prapor_08 | Pocket Change | Collect | ₽5,000 | 5000 | 250 |
| prapor_09 | Full Auto | Kill | PMC | 5 | 200 |
| prapor_10 | Scav Massacre | Kill | Scav | 15 | 350 |

**Therapist (7 quests):**

| ID | Name | Type | Target | Count | XP |
|---|---|---|---|---|---|
| therapist_01 | Explorer | Extract | Any | 3 | 60 |
| therapist_02 | Scrap Metal | Collect | ₽2,000 | 2000 | 50 |
| therapist_03 | Deep Pockets | Extract | Any | 5 | 100 |
| therapist_04 | Back Pain | Extract | Any | 6 | 120 |
| therapist_05 | The Doctor is Out | Extract | no_medkit | 1 | 200 |
| therapist_06 | Blood Bank | Valuables | Valuables | 8 | 150 |
| therapist_07 | Check-up | Extract | Any | 8 | 160 |

**Ragman (8 quests):**

| ID | Name | Type | Target | Count | XP |
|---|---|---|---|---|---|
| ragman_01 | Collector | Valuables | Valuables | 3 | 100 |
| ragman_02 | Lend-Lease | Find | ledx | 1 | 200 |
| ragman_03 | Hardware | Valuables | Valuables | 6 | 150 |
| ragman_04 | Tetriz Hunter | Find | tetriz | 1 | 180 |
| ragman_05 | Rags to Riches | Valuables | Valuables | 12 | 200 |
| ragman_06 | Fashionably Late | Collect | ₽4,000 | 4000 | 180 |
| ragman_07 | Threadbare | Valuables | Valuables | 5 | 120 |
| ragman_08 | Hand-Me-Down | Extract | Any | 5 | 110 |

---

## 14. Economy

### 14.1 Currency

Single currency: **Roubles (₽)**

Starting balance: ₽120,000

### 14.2 Trader Shops

**Therapist** (Medical & Food):

| Item | Cost |
|---|---|
| AI-2 Medkit | ₽6,000 |
| IFAK | ₽24,000 |
| Water Bottle | ₽10,000 |
| Energy Drink | ₽20,000 |

**Mechanic** (Weapon Mods):

| Item | Cost |
|---|---|
| Collimator | ₽22,000 |
| Holographic Sight | ₽48,000 |
| Suppressor | ₽58,000 |
| Vertical Grip | ₽18,000 |
| Extended Mag | ₽15,000 |
| Drum Mag | ₽72,000 |
| Precision Stock | ₽34,000 |

### 14.3 Sell Prices

All items sell at their defined `value` property (1:1 with item value, not markup).

---

## 15. Extraction & Death

### 15.1 Extraction

Reaching the final tile (Extraction Zone) triggers:

1. **Base XP Calculation:**
   ```
   baseXP = (totalKills × 10) + floor(lootValue / 10)
   baseXP = floor(baseXP × 1.25)  # +25% extraction bonus
   ```

2. **Quest evaluation**: All active quests checked against raid stats
3. **Skill training**: Perception +25 XP
4. **Level up check**: If `xp >= maxXp`, level up and award random skill point
5. **Loot transfer**: All backpack + secure container items moved to stash
6. **Armor repair**: Equipped armor and helmet durability fully restored
7. **Quest refill**: Completed quests replaced, pool drawn to 5 active

### 15.2 Kill XP Rewards

| Enemy Tier | XP |
|---|---|
| Scav | 20 |
| PMC | 45 |
| Boss | 80 |

### 15.3 Death (KIA)

**Causes:**
- Head or Thorax HP reaches 0
- Fatal dehydration (hydration = 0)
- Emergency disconnect (manual button press)

**Consequences:**
- **Secure container items**: Saved to stash
- **Backpack items**: Permanently lost
- **Armor durability**: Not restored (until extraction)
- **Raid stats**: KIA recorded, survival rate recalculated

### 15.4 Survival Rate

```
survivalRate = floor((survivedCount / raidsCount) × 100)
```

---

## 16. Game Loop

### 16.1 Main Loop Architecture

```
┌─────────────────────────────────────────────────────┐
│                    APP LIFECYCLE                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. INITIALIZATION                                   │
│     ├── Load state from localStorage                 │
│     ├── Backfill missing fields (legacy compat)     │
│     └── Start passive recovery timer (5s interval)  │
│                                                      │
│  2. PREPARATION PHASE (Player-controlled)           │
│     ├── Select character class                       │
│     ├── Equip weapons & mods                         │
│     ├── Manage stash inventory                       │
│     ├── Upgrade hideout modules                      │
│     ├── Consume medical/provisions                   │
│     └── Select deployment map                        │
│                                                      │
│  3. RAID PHASE (AI-controlled simulation)           │
│     ├── Deploy: Generate procedural map tiles        │
│     ├── Tick loop (interval: 1500ms / playSpeed)    │
│     │   ├── Advance time (12-20s per tick)          │
│     │   ├── Decay hydration/energy                   │
│     │   ├── Check death conditions                   │
│     │   ├── COMBAT: simulateCombatRound()           │
│     │   │   ├── Initiative → Action → Bullets       │
│     │   │   ├── Kill → Loot → Reinforcements?      │
│     │   │   └── KIA → Save container, end raid      │
│     │   ├── SCAVENGING:                             │
│     │   │   ├── 25% → Combat encounter              │
│     │   │   └── 75% → 3 loot rolls + maintenance   │
│     │   └── EXTRACTION:                             │
│     │       ├── Finalize quests & XP                 │
│     │       ├── Level up check                       │
│     │       ├── Transfer loot to stash               │
│     │       └── Refill quest pool                    │
│     └── Terminal log feed (auto-scrolling)          │
│                                                      │
│  4. POST-RAID (Back to Preparation)                  │
│     ├── Passive healing timer active                 │
│     ├── Player reviews raid outcome                  │
│     └── Return to step 2                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 16.2 Simulation Speed

| Speed | Interval | Use Case |
|---|---|---|
| 1x | 1500ms | Normal observation |
| 2x | 750ms | Moderate pace |
| 5x | 300ms | Quick raids |
| 10x | 150ms | Speed-running |

### 16.3 Maintenance Phase (Post-Combat)

Executed after each combat encounter (or scavenging tile):

```
Step 1: Surgical Kit Repair
    → Scan for blacked-out limbs (HP=0)
    → Restore to 1 HP using surgical kit uses
    → Order: Stomach → Legs → Arms

Step 2: Bleed Stop
    → Costs 20 medkit resource points
    → Searches backpack for backup if equipped kit insufficient

Step 3: Medkit Healing
    → Heals all damaged parts in priority order
    → 25 HP per medkit application
    → Searches backpack for backup medkits

Step 4: Ammo Resupply
    → Matching caliber ammo box from backpack
    → Fully reloads magazine + reserve mags

Step 5: Provision Consumption
    → Auto-eats/drinks when hydration < 50%
    → Equipped provision first, then backpack search

Step 6: HP Summary Report
    → Logs current vital signs to terminal
```

---

## 17. Architecture

### 17.1 State Management

- **React `useState`** for all game state
- **`localStorage`** for persistence (key: `tarkov_zero_player_state_v1`)
- **Deep clone pattern**: All mutations via `JSON.parse(JSON.stringify(state))`
- **Save on every mutation**: Every `setGameState` call writes to `localStorage`

### 17.2 Legacy Save Compatibility

Backfill logic in `hooks/useGameSave.ts` handles missing fields from older save formats:
- Missing skills → default to level 5
- Missing body parts → recalculate from Constitution
- Missing quest/history fields → initialize defaults
- Missing weapon magazine stats → restore from template
- Item property realignment → re-reference static `ALL_ITEMS` database

### 17.3 Passive Recovery System

Managed by `hooks/useRaidTick.ts`:
- **HP Recovery**: Every 5 seconds when not in raid, heals based on medstation level
- **Energy/Hydration Recovery**: Restores over time when nutrition unit is level 1+

### 17.4 Raid Tick System

Managed by `hooks/useRaidTick.ts`:
- Dispatches `runRaidTick()` at interval based on play speed (`Math.max(100, 1500 / playSpeed)`)
- Stops when `activeRaid.isActive` becomes false

### 17.5 Simulation Engine as Pure Function

The core engine `runRaidTick(state) → state` is a **pure function** that:
- Takes the full game state as input
- Returns a new state (deep cloned)
- Performs all combat, looting, maintenance, and navigation logic
- Generates log entries for the terminal feed

### 17.6 No Server-Side Logic

Despite `express` and `@google/genai` being in `package.json` dependencies, the game is **entirely client-side**. The Gemini API integration appears to be scaffolding from the AI Studio template but is not wired into any game logic.

---

## 18. Data Structures

### 18.1 GameState (Root)

```typescript
interface GameState {
    pmc: PMCCharacter;
    stash: Stash;
    hideout: Hideout;
    activeRaid: RaidState;
    selectedMapId: string;
    activeQuests: Quest[];
    completedQuestIds: string[];
    pastRaidOutcomes: ("extracted" | "kia")[];
}
```

### 18.2 PMCCharacter

```typescript
interface PMCCharacter {
    classType: ClassType;
    level: number;
    xp: number;
    maxXp: number;
    bodyParts: PMCBodyParts;       // 7 independently tracked parts
    energy: number;
    maxEnergy: number;
    hydration: number;
    maxHydration: number;
    skills: CharacterSkills;       // 5 RPG skills
    survivalRate: number;
    raidsCount: number;
    survivedCount: number;
    kiaCount: number;
    killsCount: number;
    equippedArmor: GameItem | null;
    equippedHelmet: GameItem | null;
    equippedMedkit: GameItem | null;
    equippedSurgicalKit: GameItem | null;
    equippedProvision: GameItem | null;
}
```

### 18.3 RaidState

```typescript
interface RaidState {
    isActive: boolean;
    map: MapData | null;
    tiles: RoomTile[];
    currentStage: number;
    status: "deploying" | "scavenging" | "combat" | "extracting" | "extracted" | "kia";
    combatTarget: EnemyState | null;
    logs: RaidLog[];
    lootFound: { item: GameItem; quantity: number }[];
    secureContainerSaved: { item: GameItem; quantity: number }[];
    elapsedSeconds: number;
    playSpeed: number;
    usedMedkitDuringRaid: boolean;
    reinforcementsSpawnedThisTile: number;
    killsByTier: { Scav: number; PMC: number; Boss: number; [bossName: string]: number };
    pmcIsBleeding?: boolean;
    pmcIsCovered?: boolean;
}
```

### 18.4 GameItem

```typescript
interface GameItem {
    id: string;
    name: string;
    description: string;
    type: ItemType;           // barter|medical|provision|weapon_mod|currency|ammo|armor|helmet|valuable|quest
    rarity: "common" | "rare" | "epic" | "legendary" | "quest";
    value: number;            // Sell price in Roubles
    iconName: string;
    armorClass?: number;
    durability?: number;
    maxDurability?: number;
    protectedZones?: string[];
    resourceCurrent?: number;
    resourceMax?: number;
    provisionType?: "hydration" | "energy";
    hpHeal?: number;
    modCategory?: WeaponModCategory;
    ergoBonus?: number;
    recoilReduction?: number;
    dmgBonus?: number;
    critBonus?: number;
    caliber?: string;
    soldBy?: string;          // Trader ID if buyable
    traderCost?: number;      // Purchase price in Roubles
}
```

### 18.5 Weapon

```typescript
interface Weapon {
    id: string;
    name: string;
    baseErgo: number;
    baseRecoil: number;
    baseDmg: number;
    baseAccuracy: number;
    mods: { [key in WeaponModCategory]?: GameItem | null };
    signatureClass: ClassType;
    caliber: string;
    currentMagRounds: number;
    maxMagSize: number;
    reserveMags: number;
    maxReserveMags: number;
}
```

### 18.6 EnemyState

```typescript
interface EnemyState {
    name: string;
    tier: "Scav" | "PMC" | "Boss";
    level: number;
    bodyParts: PMCBodyParts;
    skills: CharacterSkills;
    baseAccuracy: number;
    equippedWeapon: Weapon;
    equippedArmor: GameItem | null;
    equippedHelmet: GameItem | null;
    isBleeding: boolean;
    bleedingPartId?: string;
    isCovered: boolean;
    isDead: boolean;
}
```

### 18.7 Quest

```typescript
interface Quest {
    id: string;
    name: string;
    trader: "prapor" | "therapist" | "ragman";
    type: "Kill" | "Extract" | "Find" | "Collect" | "Valuables";
    target: string;
    count: number;
    progress: number;
    completed: boolean;
    rewardXp: number;
}
```

---

## 19. Source File Map

| File | Lines | Responsibility |
|---|---|---|
| `src/types.ts` | 243 | All TypeScript type/interface/enum definitions |
| `src/data.ts` | 565 | Static game database: items, weapons, maps, hideout, quests, factory functions |
| `src/gameEngine.ts` | 7 | Barrel re-export for engine modules |
| `src/engine/combat.ts` | 283 | Combat resolution, damage calculation, armor penetration |
| `src/engine/raidSimulation.ts` | 281 | Raid tick processor, stage orchestration, navigation |
| `src/engine/maintenance.ts` | 145 | Healing, surgery, provisions, ammo reload, bleed stop |
| `src/engine/spawning.ts` | 143 | Enemy generation by tier and map |
| `src/engine/loot.ts` | 120 | Loot rolling, backpack capacity, loot phase execution |
| `src/engine/progression.ts` | 85 | XP awards, quest completion, skill gains |
| `src/engine/utils.ts` | 20 | Shared helpers (createLog) |
| `src/hooks/useGameSave.ts` | 161 | localStorage persistence, initial state, legacy backfill |
| `src/hooks/useRaidTick.ts` | 68 | Passive recovery timer, raid tick dispatch |
| `src/App.tsx` | 531 | Root React component, state management, event handlers |
| `src/components/RaidScreen.tsx` | 605 | Raid deployment UI, simulation monitor, terminal log feed |
| `src/components/StashScreen.tsx` | 435 | Inventory management, trader market, PMC vitals monitor |
| `src/components/ProgressionScreen.tsx` | 327 | Hideout upgrade UI, skill display, class selection |
| `src/components/WeaponModding.tsx` | 241 | Weapon modification bench UI, 6 mod slots |
| `src/components/BodyMap.tsx` | 108 | 7-zone body part HP visualization component |
| `src/gameEngine.test.ts` | 31 | Vitest smoke tests (spawning, loot, backpack capacity) |
| `src/main.tsx` | 9 | React DOM entry point (StrictMode rendering) |
| `src/index.css` | ~30 | Global CSS (Inter/JetBrains Mono fonts, Tailwind directives) |

---

*This document was generated by reverse-engineering the source code at `D:\DOWNLOADS\VSCode\tarkov-zero-player-roguelike`. All formulas, values, and mechanics described herein are extracted directly from the TypeScript implementation.*
