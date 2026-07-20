# Architecture Analysis: Engine Complexity & Data-Driven Refactoring Roadmap

## Overview

This document analyzes **TARCOS engine complexity** and identifies opportunities to improve separation of concerns through **data-driven design**. The analysis covers 6 subsystems across 1,300+ lines of game logic, revealing ~100+ lines of duplication, scattered hardcoded values, and high cognitive load in the main orchestrator.

---

## Executive Summary

### Current Pain Points

| File | Lines | Primary Issue | Impact |
|------|-------|---------------|--------|
| **raidSimulation.ts** | 335 | KIA logic duplicated 3x, hardcoded thresholds, scattered decay rates | High maintainability cost, bug-prone |
| **combat.ts** | 309 | Class passives, ballistics, armor deeply scattered in ternary chains | High rebalancing friction |
| **spawning.ts** | 161 | Tier-specific stat ranges duplicated, nested conditionals | Difficult to add new enemy types |
| **maintenance.ts** | 164 | Backup item search logic duplicated 3x, hardcoded costs | Error-prone refactoring |
| **loot.ts** | 115 | Secure container sort duplicated, doesn't check hideout level (BUG) | Logic divergence |
| **data.ts** | 560 | Mixed content (items, maps) + tuning (weights, formulas) | Monolithic, growing tech debt |

### Proposed Solution

- Extract **gameplay formulas & thresholds** into configuration objects
- Centralize **duplicated algorithms** (loot sorting, KIA resolution)
- Create **data-driven profiles** for enemy tiers, combat passives, medical mechanics
- Split `data.ts` into **content** (items, maps) and **tuning** (balance, config)

### Expected Outcomes

- ✅ Remove ~100+ lines of duplication
- ✅ Reduce raidSimulation.ts from 335 → 200 lines (40% smaller)
- ✅ Enable balance tweaking without touching engine logic
- ✅ Improve testability (pure functions on config)
- ✅ Lower onboarding friction for new developers

---

## Detailed Analysis

### 1. RAIDSIMIULATION.TS: The God Function (335 lines)

#### Problem: Too Many Concerns

`runRaidTick()` handles:

1. **Nutrition/hydration decay** (lines 28–52)
   - Decay rate application
   - Skill-based reduction
   - Hideout modifier application

2. **KIA status transitions** (3x: lines 43, 111, dehydration path)
   - Secured loot saving
   - XP/skill leveling
   - Survival rate calculation
   - **Entire 60-line block repeated**

3. **Combat orchestration** (lines 106–242)
   - Combat round delegation
   - Death handling
   - Reinforcement spawning
   - Loot distribution from kills

4. **Loot distribution logic** (lines 186–222)
   - Secure container sorting
   - Backpack capacity checks
   - **Duplicated from loot.ts**

5. **Raid end conditions** (lines 248–317)
   - Extraction handling
   - Quest finalization
   - Armor durability reset

6. **Encounter spawning** (lines 321–332)
   - Enemy roll logic

#### Specific Issues

**Issue 1: Duplicated KIA Handling**

```typescript
// Path 1: Dehydration KIA (lines 55–103)
if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
  raid.status = "kia";
  pmc.kiaCount++;
  pmc.raidsCount++;
  newState.pastRaidOutcomes.push("kia");
  raid.isActive = false;
  
  raid.secureContainerSaved.forEach((containerEntry) => {
    const stashEntry = newState.stash.items.find(i => i.item.id === containerEntry.item.id);
    if (stashEntry) stashEntry.quantity += containerEntry.quantity;
    else newState.stash.items.push({ item: containerEntry.item, quantity: containerEntry.quantity });
  });
  
  const { logs: questLogs, earnedXp } = finalizeQuestsAndXP(newState, false, newState.hideout);
  pmc.xp += earnedXp;
  raid.logs.push(...questLogs);
  
  const perception = pmc.skills.perception;
  perception.xp += 25;
  if (perception.xp >= perception.maxXp) {
    perception.level++;
    perception.xp -= perception.maxXp;
    raid.logs.push(createLog(`SKILL INCREASE: Perception reached Level ${perception.level}!`, "info", raid.elapsedSeconds));
  }
  
  while (pmc.xp >= pmc.maxXp) {
    pmc.level++;
    pmc.xp -= pmc.maxXp;
    pmc.maxXp = pmc.level * 200;
    // Skill distribution...
  }
}

// Path 2: Combat KIA (lines 111–158) — IDENTICAL
if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
  // ... same 40+ lines
}
```

**→ Fix:** Extract to `handleKIA(state, reason)` function

---

**Issue 2: Hardcoded Decay Rates**

```typescript
// Lines 36–37: Magic numbers with unclear intent
if (Math.random() < 0.25 * drainModifier) pmc.energy = Math.max(0, pmc.energy - 1);
if (Math.random() < 0.30 * drainModifier) pmc.hydration = Math.max(0, pmc.hydration - 1);

// Lines 31–33: Hidden formula
const rateReduction = newState.hideout.nutritionUnit.level >= 3 ? 0.8 : 1.0;
const skillReduction = Math.max(0.5, 1 - enduranceLevel * 0.015);
const drainModifier = rateReduction * skillReduction;
```

**Questions:**
- Why 0.25 for energy, 0.30 for hydration?
- Where does 0.015 (constitution multiplier) come from?
- Why is nutritionUnit level 3 = 0.8 reduction?

**→ Fix:** Move to `raidConfig.ts`:

```typescript
export const RAID_CONFIGURATION = {
  nutrition: {
    energyDecayChance: 0.25,
    hydrationDecayChance: 0.30,
    decayAmount: 1,
    nutritionUnitReduction: {
      0: 1.0,
      1: 1.0,
      2: 1.0,
      3: 0.8,
    },
    constitutionReductionRate: 0.015,
    constitutionReductionMin: 0.5,
  },
};
```

---

**Issue 3: Scattered Status Thresholds**

```typescript
// Lines 48–52: Warning thresholds (where else are they defined?)
if (pmc.hydration <= 0) {
  // KIA condition
} else if (pmc.hydration < 25 && raid.status !== "combat") {
  if (Math.random() < 0.15) raid.logs.push(createLog("Player is severely dehydrated!"));
} else if (pmc.hydration < 50 && raid.status !== "combat") {
  if (Math.random() < 0.15) raid.logs.push(createLog("Player is thirsty"));
}
```

**→ Fix:** Centralize in config:

```typescript
export const RAID_CONFIGURATION = {
  status: {
    dehydrationThreshold: 0,
    severeDehydrationLevel: 25,
    dehydrationWarningLevel: 50,
    severeDehydrationWarningChance: 0.15,
    dehydrationWarningChance: 0.15,
  },
};
```

---

**Issue 4: Loot Distribution Logic Duplicated**

```typescript
// In raidSimulation.ts, lines 186–222
const allLoot = [...raid.lootFound, ...raid.secureContainerSaved];
const singleItems: GameItem[] = [];
allLoot.forEach(e => {
  for (let q = 0; q < e.quantity; q++) singleItems.push(e.item);
});
singleItems.sort((a, b) => b.value - a.value);

const secureSorted: { [id: string]: { item: GameItem; quantity: number } } = {};
const backpackSorted: { [id: string]: { item: GameItem; quantity: number } } = {};

singleItems.forEach((single, idx) => {
  if (idx < secureCap) {
    if (!secureSorted[single.id]) secureSorted[single.id] = { item: single, quantity: 0 };
    secureSorted[single.id].quantity++;
  } else {
    if (!backpackSorted[single.id]) backpackSorted[single.id] = { item: single, quantity: 0 };
    backpackSorted[single.id].quantity++;
  }
});

raid.secureContainerSaved = Object.values(secureSorted);
raid.lootFound = Object.values(backpackSorted);
```

This **exact same logic** appears in `loot.ts` lines 78–101.

**→ Fix:** Extract to `lootManagement.ts`

---

### 2. COMBAT.TS: Algorithmic Coupling (309 lines)

#### Problem: Class Passives & Game Balance Scattered Throughout

**Issue 1: Class Passives Hardcoded in Combat Logic**

```typescript
// Line 141–143: SURVIVOR passive
if (attacker.type === "pmc" && pmc.classType === ClassType.SURVIVOR) {
  actionChosen = "fire";
  roundLogs.push(createLog("SURVIVOR PASSIVE: Free Reload triggered!", "info", elapsedSeconds));
} else {
  continue;
}

// Line 177–179: SCOUT burst range
const isScoutSMG = attacker.type === "pmc" && pmc.classType === ClassType.SCOUT;
const minBurst = isScoutSMG ? 3 : 1;
const maxBurst = isScoutSMG ? 7 : 5;

// Line 200–201: SCOUT dodge bonus
const dodgeMult = (attacker.type === "enemy" && pmc.classType === ClassType.SCOUT) ? 2.0 : 1.0;

// Line 240–241: SOLDIER damage bonus
if (attacker.type === "pmc" && pmc.classType === ClassType.SOLDIER) bulletDmg = Math.floor(bulletDmg * 1.20);
else if (attacker.type === "enemy" && pmc.classType === ClassType.SOLDIER) bulletDmg = Math.floor(bulletDmg * 0.85);

// Line 277–280: LUCKY survival passive
if (pmc.classType === ClassType.LUCKY && Math.random() < 0.15) {
  defender.bodyParts.head.current = 1;
  defender.bodyParts.thorax.current = 1;
  roundLogs.push(createLog("LUCKY PASSIVE TRIGGERED!", "warning", elapsedSeconds));
}
```

**Problems:**
- 5+ class checks scattered across 300 lines
- Changing SCOUT dodge from 2.0 → 2.5 requires code modification
- New class addition requires editing combat.ts
- Passives not visible in one place

---

**Issue 2: Ballistics Table Embedded as Conditionals**

```typescript
// Lines 216–221: Bullet penetration values
let bulletPen = 20;
if (curWep.caliber === "7.62x39mm") bulletPen = 34;
else if (curWep.caliber === "9x19mm") bulletPen = isScoutSMG ? 32 : 20;
else if (curWep.caliber === "12x70mm") bulletPen = 18;
else if (curWep.caliber === "7.62x54mm") bulletPen = 45;
else if (curWep.caliber === "9x18mm") bulletPen = 15;
```

**Problem:** Ballistics data mixed with logic. No single source for "9x19mm pen = 20".

---

**Issue 3: Armor Mechanics Formula Hardcoded**

```typescript
// Lines 226–237: Armor effectiveness
const effectiveArmor = activeArmor.armorClass * (activeArmor.durability / activeArmor.maxDurability);
const armorThreshold = effectiveArmor * 10;
if (bulletPen < armorThreshold) {
  dmgMultiplier = 0.20;
  activeArmor.durability = Math.max(0, activeArmor.durability - 5);
} else {
  dmgMultiplier = 0.60;
  activeArmor.durability = Math.max(0, activeArmor.durability - 10);
}
```

**Questions:**
- Why multiply by 10 for threshold?
- Why 20% vs 60% damage multiplier?
- Why 5 vs 10 durability loss?
- What if we want to adjust armor balance?

---

**Issue 4: Bleed Chance Formula Scattered**

```typescript
// Line 262: Bleed chance formula
let bleedChance = Math.max(5, 35 - defender.skills.constitution.level * 1.0);
if (defender.hydration < 25) bleedChance += 10;
else if (defender.hydration < 50) bleedChance += 5;

if (Math.random() * 100 < bleedChance) {
  defender.isBleeding = true;
}
```

**Problem:** Base chance (35), min (5), skill reduction (1.0), hydration penalties (10/5) are magic numbers.

---

#### Proposed Data-Driven Combat

```typescript
// src/data/tuning/combatBalance.ts

export const CLASS_COMBAT_PASSIVE: Record<ClassType, CombatPassive> = {
  [ClassType.SOLDIER]: {
    name: "disciplined_fire",
    description: "Deal 20% more damage, take 15% less damage",
    effects: {
      outgoingDmgMultiplier: 1.20,
      incomingDmgMultiplier: 0.85,
    },
  },
  [ClassType.SURVIVOR]: {
    name: "free_reload",
    description: "After reload, immediately fire for free",
    triggerAfter: "reload",
    actionChosen: "fire",
  },
  [ClassType.SCOUT]: {
    name: "burst_specialist",
    description: "Burst 3-7 with SMGs, 2x dodge vs enemies",
    burstConfig: { minRounds: 3, maxRounds: 7 },
    dodgeMultiplier: 2.0,
  },
  [ClassType.MARKSMAN]: {
    name: "steady_aim",
    description: "Highest base accuracy, slower ROF",
    accuracyBonus: 15,
    burstConfig: { minRounds: 1, maxRounds: 3 },
  },
  [ClassType.LUCKY]: {
    name: "fortitude",
    description: "Survive fatal blow 15% of the time",
    survivalChance: 0.15,
    survivesAt: 1, // HP restored to
  },
};

export const BALLISTICS_TABLE: Record<string, BallisticsProfile> = {
  "7.62x39mm": { penetration: 34, baseDamage: 50, velocity: "medium" },
  "9x19mm": { penetration: 20, baseDamage: 28, velocity: "medium" },
  "12x70mm": { penetration: 18, baseDamage: 65, velocity: "low" },
  "7.62x54mm": { penetration: 45, baseDamage: 75, velocity: "high" },
  "9x18mm": { penetration: 15, baseDamage: 25, velocity: "low" },
};

export const ARMOR_MECHANICS = {
  blockDmgMultiplier: 0.20,
  penetrateDmgMultiplier: 0.60,
  durabilityLossBlocked: 5,
  durabilityLosPenetrated: 10,
  armorThresholdFormula: (armorClass: number, durabilityRatio: number) => 
    armorClass * durabilityRatio * 10,
};

export const BLEED_MECHANICS = {
  baseChance: 35,
  minChance: 5,
  constitutionReduction: 1.0,
  hydrationPenalty: {
    under25: 10,
    under50: 5,
  },
  blockCondition: "armor_blocked_fully", // Don't bleed if armor fully stops shot
};

export const ACCURACY_CALCULATION = {
  burstDecayRate: { pmc: 2.5, enemy: 3.0 },
  coverPenalty: 20,
  hydrationPenalty: {
    under25: 10,
    under50: 5,
  },
  shootingRangeBonus: (level: number) => {
    const bonusMap = { 1: 1, 2: 3, 3: 6 };
    return bonusMap[level] ?? 0;
  },
};
```

---

### 3. SPAWNING.TS: Duplicated Tier Profiles (161 lines)

#### Problem: Enemy Attributes Defined 3 Times (Boss, PMC, Scav)

```typescript
// Lines 20–25: Boss stats
initiativeRange = [13, 17];
agilityRange = [11, 15];
weaponSkillRange = [15, 20];
perceptionRange = [11, 14];
constitutionRange = [6, 9];
baseAccuracy = 40;

// Lines 56–61: PMC stats (different ranges)
initiativeRange = [10, 14];
agilityRange = [9, 13];
weaponSkillRange = [11, 16];
perceptionRange = [9, 12];
constitutionRange = [4, 7];
baseAccuracy = 30;

// Lines 81–86: Scav stats (different ranges)
initiativeRange = [8, 12];
agilityRange = [7, 11];
weaponSkillRange = [1, 5];
perceptionRange = [7, 11];
constitutionRange = [2, 5];
baseAccuracy = 30;
```

**Problem:** Adding a new tier (e.g., "Raider") requires adding 50+ lines of if/else.

---

**Issue 2: Equipment Pools Scattered**

```typescript
// Lines 42–48: Boss equipment
const bossWeapons = [ClassType.SOLDIER, ClassType.MARKSMAN, ClassType.LUCKY];
equippedWeapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[chosenW]));
equippedArmor = Math.random() < 0.5 ? JSON.parse(...ALL_ITEMS.armor_killa) : JSON.parse(...armor_glukhar);
equippedHelmet = Math.random() < 0.5 ? JSON.parse(...ALL_ITEMS.altyn) : JSON.parse(...helmet_6b47);

// Lines 68–74: PMC equipment
if (Math.random() < 0.70) {
  equippedArmor = Math.random() < 0.5 ? JSON.parse(...armor_6b13) : JSON.parse(...armor_6b13_heavy);
}
if (Math.random() < 0.60) {
  const helmets = [ALL_ITEMS.helmet_6b47, ALL_ITEMS.ulach, ALL_ITEMS.fast_mt, ALL_ITEMS.tor_team];
  equippedHelmet = JSON.parse(JSON.stringify(helmets[...]));
}

// Lines 88–110: Scav weapons
if (rollWeapon < 0.50) {
  equippedWeapon = { id: "pistol", /* inline definition */ };
} else {
  const scavWeapons = [ClassType.SURVIVOR, ClassType.SCOUT, ClassType.SOLDIER];
  equippedWeapon = JSON.parse(...INITIAL_WEAPONS[classWeapon]);
}
```

---

#### Proposed Data-Driven Spawning

```typescript
// src/data/tuning/enemySpawning.ts

export const ENEMY_SPAWN_PROFILES: Record<"Boss" | "PMC" | "Scav", EnemyProfile> = {
  Boss: {
    tier: "Boss",
    namePool: ["Killa", "Glukhar", "Tagilla", "Reshala", "Shturman"],
    levelOffset: (pmcLevel) => pmcLevel + 5,
    levelCap: 65,
    skills: {
      initiative: [13, 17],
      agility: [11, 15],
      weaponSkill: [15, 20],
      perception: [11, 14],
      constitution: [6, 9],
    },
    baseAccuracy: 40,
    armor: {
      pool: ["armor_killa", "armor_glukhar"],
      spawnChance: 1.0,
    },
    helmet: {
      pool: ["altyn", "helmet_6b47"],
      spawnChance: 1.0,
    },
    weaponClasses: ["SOLDIER", "MARKSMAN", "LUCKY"],
    xpReward: 80,
  },
  PMC: {
    tier: "PMC",
    namePool: ["Ghost", "Hammer", "Viking", "Frost", "Viper", "Raven", "Slayer", "Sherpa", "DormChad"],
    levelOffset: (pmcLevel) => pmcLevel + Math.floor(Math.random() * 11) - 5,
    levelCap: 60,
    skills: {
      initiative: [10, 14],
      agility: [9, 13],
      weaponSkill: [11, 16],
      perception: [9, 12],
      constitution: [4, 7],
    },
    baseAccuracy: 30,
    armor: {
      pool: ["armor_6b13", "armor_6b13_heavy"],
      spawnChance: 0.70,
    },
    helmet: {
      pool: ["helmet_6b47", "ulach", "fast_mt", "tor_team"],
      spawnChance: 0.60,
    },
    weaponClasses: ["SOLDIER", "LUCKY"],
    weaponDistribution: [0.75, 0.25], // 75% SOLDIER, 25% LUCKY
    xpReward: 45,
  },
  Scav: {
    tier: "Scav",
    namePool: ["Bomzh", "Gopnik", "Tushonka", "Ded", "Cheeki", "Breeki", "Serega", "Kolya", "Morozov"],
    levelOffset: (pmcLevel) => pmcLevel - (Math.floor(Math.random() * 11) + 5),
    levelCap: 99,
    skills: {
      initiative: [8, 12],
      agility: [7, 11],
      weaponSkill: [1, 5],
      perception: [7, 11],
      constitution: [2, 5],
    },
    baseAccuracy: 30,
    armor: {
      pool: ["paca"],
      spawnChance: 0.40,
    },
    helmet: {
      pool: ["untar", "ssh68"],
      spawnChance: 0.20,
    },
    weaponClasses: ["SOLDIER", "SCOUT", "SURVIVOR"],
    weaponDistribution: [0.5, 0.25, 0.25],
    hasPistolFallback: true, // 50% chance of pistol instead
    xpReward: 20,
  },
};
```

Then refactored spawning:

```typescript
// src/engine/spawning.ts (simplified)

export const spawnEnemy = (map: MapData, pmcLevel: number): EnemyState => {
  const tierRoll = Math.random();
  const isBoss = tierRoll < map.bossSpawnChance;
  const isPMC = !isBoss && tierRoll < (map.bossSpawnChance + map.pmcSpawnChance);
  const tierKey: TierType = isBoss ? "Boss" : isPMC ? "PMC" : "Scav";
  
  const profile = ENEMY_SPAWN_PROFILES[tierKey];
  const name = randomFromArray(profile.namePool);
  const level = clampLevel(profile.levelOffset(pmcLevel), profile.levelCap);
  
  const skills = rollSkillsFromProfile(profile);
  const bodyParts = calculateBodyParts(skills.constitution.level);
  const equippedWeapon = rollWeaponFromProfile(profile);
  const equippedArmor = rollFromPool(profile.armor, profile.armor.pool);
  const equippedHelmet = rollFromPool(profile.helmet, profile.helmet.pool);
  
  return {
    name,
    tier: tierKey,
    level,
    bodyParts,
    skills,
    baseAccuracy: profile.baseAccuracy,
    equippedWeapon,
    equippedArmor,
    equippedHelmet,
    isBleeding: false,
    isCovered: false,
    isDead: false,
  };
};
```

---

### 4. MAINTENANCE.TS: Backup Item Search Duplication (164 lines)

#### Problem: 3 Near-Identical Backup Searches

```typescript
// Path 1: Surgical kit backup (lines 25–36)
const backupEntryIdx = raid.lootFound.findIndex(
  e => e.item.type === "medical" && e.item.id.includes("kit") && e.item.resourceCurrent && e.item.resourceCurrent > 0
);

// Path 2: Medkit backup (lines 49–61)
const backupIdx = raid.lootFound.findIndex(
  e => e.item.type === "medical" && e.item.resourceCurrent && e.item.resourceCurrent >= 20
);

// Path 3: Provision backup (lines 144–157)
const backupIdx = raid.lootFound.findIndex(
  e => e.item.type === "provision" && e.item.resourceCurrent && e.item.resourceCurrent > 0
);
```

**Problems:**
- 3 similar predicates (inconsistent)
- Different resource thresholds (>= 20 vs > 0)
- Code duplication after finding backup

---

**Issue 2: Hardcoded Medical Costs**

```typescript
// Line 44: Where does 20 come from?
if (pmc.equippedMedkit && pmc.equippedMedkit.resourceCurrent && pmc.equippedMedkit.resourceCurrent >= 20) {
  pmc.equippedMedkit.resourceCurrent -= 20;
  pmc.isBleeding = false;
}
```

---

#### Proposed Medical Config

```typescript
// src/data/tuning/medicalConfig.ts

export const MEDICAL_MECHANICS = {
  bleeds topCost: 20,
  surgeryTargetOrder: ["stomach", "leftLeg", "rightLeg", "leftArm", "rightArm"],
  healOrder: ["head", "thorax", "stomach", "leftLeg", "rightLeg", "leftArm", "rightArm"],
  maxHealAttempts: 5,
  defaultHealPerUse: 25,
};

export const findBackupMedical = (
  loot: { item: GameItem; quantity: number }[],
  type: "surgical" | "medkit" | "provision"
): { index: number; item: GameItem } | null => {
  const predicates: Record<string, (e: GameItem) => boolean> = {
    surgical: (e) => e.type === "medical" && e.medicalSubType === "surgical" && 
                     e.resourceCurrent && e.resourceCurrent > 0,
    medkit: (e) => e.type === "medical" && e.medicalSubType === "medkit" && 
                   e.resourceCurrent && e.resourceCurrent >= MEDICAL_MECHANICS.bleeds topCost,
    provision: (e) => e.type === "provision" && 
                      e.resourceCurrent && e.resourceCurrent > 0,
  };
  
  const idx = loot.findIndex(entry => predicates[type](entry.item));
  return idx !== -1 ? { index: idx, item: loot[idx].item } : null;
};

export const consumeBackupMedical = (
  loot: { item: GameItem; quantity: number }[],
  index: number
): void => {
  if (loot[index].quantity > 1) {
    loot[index].quantity--;
  } else {
    loot.splice(index, 1);
  }
};
```

---

### 5. LOOT.TS & RAIDSIMIULATION.TS: Secure Container Logic Duplication

#### Problem: Same Sorting Algorithm in 2 Places

**In raidSimulation.ts (lines 186–222):**
```typescript
const secureCap = newState.hideout.intelligenceCenter.level >= 3 ? 9 : 
                 newState.hideout.intelligenceCenter.level >= 2 ? 6 : 4;
// ... sorting logic
raid.secureContainerSaved = Object.values(secureSorted);
raid.lootFound = Object.values(backpackSorted);
```

**In loot.ts (lines 78–101):**
```typescript
const secureCap = 4; // HARDCODED! Doesn't check hideout level
// ... identical sorting logic
raid.secureContainerSaved = Object.values(secureSorted);
raid.lootFound = Object.values(backpackSorted);
```

**Bug:** loot.ts doesn't check hideout level, so secure container is always 4 slots.

---

#### Proposed Loot Management

```typescript
// src/engine/lootManagement.ts

export const SECURE_CONTAINER_CAPACITY = (intelligenceCenterLevel: number): number => {
  const config = {
    0: 4,
    1: 4,
    2: 6,
    3: 9,
  };
  return config[intelligenceCenterLevel] ?? 4;
};

/**
 * Single source of truth for loot partitioning
 * Splits items by value, prioritizing secure container
 */
export const sortLootIntoContainers = (
  allLoot: { item: GameItem; quantity: number }[],
  secureCap: number
): { secure: typeof allLoot; backpack: typeof allLoot } => {
  const singleItems: GameItem[] = [];
  
  // Flatten quantities
  allLoot.forEach(entry => {
    for (let q = 0; q < entry.quantity; q++) {
      singleItems.push(entry.item);
    }
  });
  
  // Sort by value descending
  singleItems.sort((a, b) => b.value - a.value);
  
  // Partition by index
  const secure: { [id: string]: { item: GameItem; quantity: number } } = {};
  const backpack: { [id: string]: { item: GameItem; quantity: number } } = {};
  
  singleItems.forEach((item, idx) => {
    const target = idx < secureCap ? secure : backpack;
    if (!target[item.id]) target[item.id] = { item, quantity: 0 };
    target[item.id].quantity++;
  });
  
  return {
    secure: Object.values(secure),
    backpack: Object.values(backpack),
  };
};
```

Then use in both places:

```typescript
// In raidSimulation.ts (line 192+):
const secureCap = SECURE_CONTAINER_CAPACITY(newState.hideout.intelligenceCenter.level);
const { secure, backpack } = sortLootIntoContainers(
  [...raid.lootFound, ...raid.secureContainerSaved],
  secureCap
);
raid.secureContainerSaved = secure;
raid.lootFound = backpack;

// In loot.ts (line 80+):
const secureCap = SECURE_CONTAINER_CAPACITY(hideout.intelligenceCenter.level); // NOW CORRECT!
const { secure, backpack } = sortLootIntoContainers(allLoot, secureCap);
raid.secureContainerSaved = secure;
raid.lootFound = backpack;
```

---

### 6. DATA.TS: Monolithic Configuration File (560 lines)

#### Problem: Mixed Content + Tuning

```typescript
// Lines 9–106: Item definitions (CONTENT)
export const ALL_ITEMS: { [id: string]: GameItem } = { /* 100+ items */ };

// Lines 119–190: Map definitions (CONTENT)
export const ALL_MAPS: MapData[] = [ /* 5 maps */ ];

// Lines 324–330: Archetype weights (TUNING!)
export const ARCHETYPE_WEIGHTS = {
  [ClassType.SOLDIER]: { weaponSkill: 30, constitution: 25, ... },
};

// Lines 333–350: Skill distribution (TUNING!)
export const distributeStartingSkills = (classType: ClassType, skills, points) => {
  // Game balance logic
};
```

**Problem:** Gameplay content mixed with balance tuning makes it hard to:
- Update item descriptions without affecting balance
- Rebalance skills without modifying content
- Review what's "tunable" vs "fixed"

---

## Refactoring Roadmap

### Proposed File Structure

```
src/
├── data/
│   ├── content/
│   │   ├── items.ts                  # ALL_ITEMS (no tuning)
│   │   ├── maps.ts                   # ALL_MAPS
│   │   ├── quests.ts                 # ALL_QUESTS
│   │   ├── weapons.ts                # INITIAL_WEAPONS
│   │   └── hideout.ts                # Hideout module definitions
│   └── tuning/
│       ├── raidConfig.ts             # Decay, thresholds, XP formulas
│       ├── combatBalance.ts          # Class passives, ballistics, armor, bleed
│       ├── enemySpawning.ts          # Tier profiles, stat ranges
│       ├── medicalConfig.ts          # Medical costs, backup search rules
│       └── lootConfig.ts             # Rarity weights, container capacity
├── engine/
│   ├── raidSimulation.ts             # 200 lines (down from 335)
│   ├── raidResolution.ts             # NEW: KIA, extraction handlers
│   ├── combat.ts                     # 250 lines (down from 309)
│   ├── combatActions.ts              # NEW: Fire, reload, cover actions
│   ├── spawning.ts                   # 80 lines (down from 161)
│   ├── maintenance.ts                # 120 lines (down from 164)
│   ├── lootManagement.ts             # NEW: Loot sorting, backup search
│   ├── loot.ts                       # Simplified using lootManagement
│   ├── progression.ts                # No change
│   └── utils.ts                      # No change
```

---

### Phase-Based Migration Strategy

#### Phase 1: Extract Raid Configuration (Low Risk)
- Create `raidConfig.ts` with decay rates, thresholds
- Update `raidSimulation.ts` to use config values
- **No logic changes**, only data extraction
- **Time:** 1-2 hours

**Files affected:** raidSimulation.ts → new raidConfig.ts

---

#### Phase 2: Centralize KIA Resolution (Medium Risk)
- Create `raidResolution.ts` with `handleKIA()`, `handleExtraction()`
- Remove 60-line duplication from raidSimulation.ts
- Update raidSimulation.ts to call new functions
- **Behavioral change:** None (refactor only)
- **Time:** 2-3 hours

**Files affected:** raidSimulation.ts → new raidResolution.ts

---

#### Phase 3: Extract Combat Balance (Medium Risk)
- Create `combatBalance.ts` with CLASS_COMBAT_PASSIVE, BALLISTICS_TABLE, etc.
- Refactor `combat.ts` to read from config
- Create `combatActions.ts` for action resolution
- **Behavioral change:** Enable tuning without code edits
- **Time:** 3-4 hours

**Files affected:** combat.ts → combatBalance.ts + combatActions.ts

---

#### Phase 4: Extract Enemy Spawning Config (Low Risk)
- Create `enemySpawning.ts` with ENEMY_SPAWN_PROFILES
- Simplify `spawning.ts` to iterate profiles
- Add function to pick weapons from distribution
- **Behavioral change:** None (refactor only)
- **Time:** 2-3 hours

**Files affected:** spawning.ts → new enemySpawning.ts

---

#### Phase 5: Centralize Loot & Medical Logic (Low Risk)
- Create `lootManagement.ts` with secure container sorting
- Create `medicalConfig.ts` with backup search predicates
- Update `loot.ts` and `maintenance.ts` to use centralized functions
- **Behavioral change:** Fix bug where loot.ts doesn't check hideout level
- **Time:** 2 hours

**Files affected:** loot.ts, maintenance.ts, raidSimulation.ts → new lootManagement.ts, medicalConfig.ts

---

#### Phase 6: Split data.ts into Content + Tuning (Low Risk)
- Move ALL_ITEMS, ALL_MAPS, ALL_QUESTS, INITIAL_WEAPONS to `data/content/`
- Move ARCHETYPE_WEIGHTS, skill distribution to `data/tuning/`
- Update imports across codebase
- **Behavioral change:** None (import reorganization)
- **Time:** 1-2 hours

**Files affected:** data.ts → split into data/content/* + data/tuning/*

---

## Complexity Reduction Summary

### Metrics

| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| **Total engine lines** | 1,290 | ~1,050 | -19% |
| **raidSimulation.ts lines** | 335 | 200 | -40% |
| **combat.ts lines** | 309 | 250 | -19% |
| **spawning.ts lines** | 161 | 80 | -50% |
| **maintenance.ts lines** | 164 | 120 | -27% |
| **Duplicated code** | ~100 | ~5 | -95% |
| **Hardcoded values** | 50+ | 5 | -90% |
| **Class checks in combat** | 5 | 1 (in config) | -80% |
| **Tier definitions** | 3 (duplicated) | 1 (config) | -67% |

### Cognitive Load Reduction

| Task | Current | Proposed | Improvement |
|------|---------|----------|-------------|
| Find "SOLDIER deals 20% damage" | Search entire codebase | Open combatBalance.ts | -95% time |
| Rebalance bleed chance | Edit combat.ts + understand formula | Edit bleedConfig | -80% friction |
| Add new enemy tier | Edit spawning.ts, add 50+ lines | Add entry to ENEMY_SPAWN_PROFILES | -90% effort |
| Understand nutrition decay | Read 15 lines of formula | Check raidConfig.ts | -60% time |

---

## Migration Checklist

### Pre-Refactor
- [ ] All tests passing (npm test)
- [ ] No uncommitted changes
- [ ] Create feature branch: `feat/engine-refactoring`

### Phase 1: Raid Configuration
- [ ] Create `src/data/tuning/raidConfig.ts`
- [ ] Extract decay rates, thresholds, XP formulas
- [ ] Update `raidSimulation.ts` to import config
- [ ] Test: `npm test` + manual raid play
- [ ] Commit: "refactor: extract raid configuration to data-driven config"

### Phase 2: KIA Resolution
- [ ] Create `src/engine/raidResolution.ts`
- [ ] Extract `handleKIA()` function
- [ ] Extract `handleExtraction()` function
- [ ] Update `raidSimulation.ts` to use new functions
- [ ] Test: `npm test` + run raids (KIA, extraction)
- [ ] Commit: "refactor: centralize KIA and extraction handling"

### Phase 3: Combat Balance
- [ ] Create `src/data/tuning/combatBalance.ts`
- [ ] Move CLASS_COMBAT_PASSIVE, BALLISTICS_TABLE, etc.
- [ ] Create `src/engine/combatActions.ts`
- [ ] Refactor `combat.ts` to read from config
- [ ] Test: `npm test` + run combat scenarios
- [ ] Commit: "refactor: data-driven combat balance system"

### Phase 4: Enemy Spawning
- [ ] Create `src/data/tuning/enemySpawning.ts`
- [ ] Move ENEMY_SPAWN_PROFILES (new data structure)
- [ ] Simplify `spawning.ts`
- [ ] Test: `npm test` + spawn enemies on each tier
- [ ] Commit: "refactor: data-driven enemy spawning profiles"

### Phase 5: Loot & Medical
- [ ] Create `src/engine/lootManagement.ts`
- [ ] Create `src/data/tuning/medicalConfig.ts`
- [ ] Centralize backup search logic
- [ ] Update `loot.ts` and `maintenance.ts`
- [ ] Test: `npm test` + check loot sorting, medical usage
- [ ] Commit: "refactor: centralize loot and medical logic"

### Phase 6: Split data.ts
- [ ] Create `src/data/content/` directory
- [ ] Move items, maps, quests, weapons
- [ ] Create `src/data/tuning/` directory
- [ ] Move balance configs
- [ ] Update imports across codebase
- [ ] Test: `npm test` + ensure no regressions
- [ ] Commit: "refactor: split data.ts into content and tuning layers"

### Post-Refactor
- [ ] All tests passing
- [ ] Manual testing: full game loop (deploy, raid, loot, extract, upgrade hideout)
- [ ] Create PR with summary of changes
- [ ] Merge to main

---

## Benefits

### For Developers
- ✅ **Easier onboarding:** "Where's the SOLDIER passive?" → combatBalance.ts
- ✅ **Lower context switching:** Related code grouped by concern
- ✅ **Faster debugging:** Reduced cognitive load, fewer places to search
- ✅ **Testability:** Pure functions on config are easy to unit test

### For Game Designers
- ✅ **No code edits for balance:** Tweak raidConfig.ts, combatBalance.ts directly
- ✅ **Visible dependencies:** See how formulas interact (e.g., bleed chance depends on hydration)
- ✅ **Version control:** Changes to balance are clear diffs
- ✅ **Experimentation:** Try A/B variants by swapping config objects

### For Maintenance
- ✅ **DRY:** 95% reduction in duplication
- ✅ **Reduced bug surface:** Fewer places where similar logic can diverge
- ✅ **Scalability:** Adding new features doesn't require deep code edits
- ✅ **Perf potential:** Data-driven approach enables config caching, precomputation

---

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|------------|-----------|
| 1: Raid Config | Low | Config values match original code exactly; test decay behavior |
| 2: KIA Resolution | Medium | Extract function first, then replace calls; test both KIA paths |
| 3: Combat Balance | High | Most complex; use branch + comprehensive combat testing |
| 4: Spawning | Low | Clear tier separation; test each tier independently |
| 5: Loot & Medical | Low | Centralize duplicated logic; fix loot.ts bug |
| 6: Split data.ts | Low | Import reorganization; watch for circular deps |

---

## Next Steps

1. **Review this analysis** with team
2. **Prioritize phases** based on team capacity
3. **Start Phase 1** on a feature branch
4. **Add unit tests** for new functions as they're created
5. **Document new structure** in README once complete

---

## References

- **God Object:** https://refactoring.guru/smells/lazy-class
- **Duplicate Code:** https://refactoring.guru/smells/duplicate-code
- **Magic Numbers:** https://refactoring.guru/smells/magic-number
- **Data-Driven Design:** https://en.wikipedia.org/wiki/Data-driven_design
