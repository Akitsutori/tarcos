/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Combat balance tuning: PMC class passives and combat ballistics.
 * Single source of truth for class-passive values (imported by
 * src/engine/behaviors/classPassives.ts and orchestrators). Pure data —
 * only imports ClassType from types (no dependency on data.ts).
 */

import { ClassType } from "../../types";

// Optional per-class combat / loot / starting-gear bonuses.
// Absent fields mean "no passive": the orchestrator falls back to the
// baseline value (e.g. burst 1-5, dodge x1.0, no free reload).
export interface ClassPassiveConfig {
  // SURVIVOR — reloading does not consume the action; fires immediately.
  freeReload?: boolean;
  // SCOUT — SMG burst spray range (baseline: 1-5) and 9x19mm penetration bonus.
  burstRange?: { min: number; max: number };
  smgPenetration?: number;
  // SCOUT — double the PMC dodge chance against incoming enemy fire.
  dodgeMultiplier?: number;
  // SOLDIER — outgoing damage multiplier (PMC as attacker) and incoming
  // damage multiplier (PMC as defender).
  outgoingDamageMultiplier?: number;
  incomingDamageMultiplier?: number;
  // LUCKY — chance to survive a fatal hit at 1 HP, +loot rolls per kill,
  // and starting armor override (ALL_ITEMS id; baseline: armor_6b13).
  fatalSurviveChance?: number;
  luckyLootRolls?: number;
  startingArmorId?: string;
}

export const CLASS_PASSIVES: Record<ClassType, ClassPassiveConfig> = {
  [ClassType.SOLDIER]: {
    outgoingDamageMultiplier: 1.2,
    incomingDamageMultiplier: 0.85,
  },
  [ClassType.SCOUT]: {
    burstRange: { min: 3, max: 7 },
    smgPenetration: 32,
    dodgeMultiplier: 2.0,
  },
  [ClassType.SURVIVOR]: {
    freeReload: true,
  },
  [ClassType.MARKSMAN]: {},
  [ClassType.LUCKY]: {
    fatalSurviveChance: 0.15,
    luckyLootRolls: 1,
    startingArmorId: "armor_6b23",
  },
};
