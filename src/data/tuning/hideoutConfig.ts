/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hideout module tuning. Single source of truth for every level-scaled hideout
 * effect: the Scavenger Workstation ModuleInstance
 * (engine/behaviors/hideoutModules.ts) reward table / cooldown / quantity
 * formula, plus the level-scaled tables for the other five modules that used
 * to hardcode their level math inline (Medstation, Nutrition Unit, Workbench,
 * Intelligence Center, Shooting Range). Values are preserved exactly from the
 * pre-extraction engine (byte-parity with the Golden Master transcripts).
 */

// Level -> reward template. Quantities are scaled up by Perception / map
// difficulty at production time (see computeScavengerWorkstationQuantity).
export const SCAVENGER_WORKSTATION_REWARD_BY_LEVEL: Record<number, { itemId: string; baseQuantity: number }> = {
  1: { itemId: "bolts", baseQuantity: 2 },
  2: { itemId: "wd40", baseQuantity: 1 },
  3: { itemId: "cpu", baseQuantity: 1 },
};

// Minimum number of raids (KIA or extraction) between workstation productions.
export const SCAVENGER_WORKSTATION_COOLDOWN_RAIDS = 2;

// Bonus quantity per 4 Perception levels (Math.floor(level * scaling)).
export const SCAVENGER_WORKSTATION_PERCEPTION_SCALING = 0.25;

// Fraction of the map's lootMultiplier above baseline (1.0) applied as bonus
// quantity.
export const SCAVENGER_WORKSTATION_LOOT_MULTIPLIER_SCALING = 0.5;

/**
 * Computes the quantity a Scavenger Workstation production delivers for a
 * given base reward, PMC Perception level, and map loot multiplier. Pure and
 * deterministic (no RNG involvement); never returns below 1.
 */
export const computeScavengerWorkstationQuantity = (
  baseQuantity: number,
  perceptionLevel: number,
  lootMultiplier: number,
): number => {
  const perceptionBonus = Math.floor(perceptionLevel * SCAVENGER_WORKSTATION_PERCEPTION_SCALING);
  const mapBonus = Math.round((lootMultiplier - 1) * SCAVENGER_WORKSTATION_LOOT_MULTIPLIER_SCALING);
  return Math.max(1, baseQuantity + perceptionBonus + mapBonus);
};

// Level -> passive HP regenerated per 5s recovery tick out of raid.
export const MEDSTATION_HEAL_PER_5S_BY_LEVEL: Record<number, number> = { 0: 1, 1: 2, 2: 5, 3: 12 };

// Level -> passive energy/hydration recovered per 5s recovery tick out of raid.
export const NUTRITION_RECOVERY_PER_5S_BY_LEVEL: Record<number, number> = { 1: 2, 2: 4, 3: 4 };

/** Passive nutrition recovery per 5s tick; 0 below Nutrition Unit level 1. */
export const nutritionRecoveryPer5s = (level: number): number =>
  NUTRITION_RECOVERY_PER_5S_BY_LEVEL[level] ?? 0;

// Level -> Secure Container capacity in slots.
export const SECURE_CONTAINER_SLOTS_BY_LEVEL: Record<number, number> = { 0: 4, 1: 4, 2: 6, 3: 9 };

/** Secure Container capacity; clamps to level 3 (levels past the table keep the max). */
export const secureContainerCapacity = (hideoutLevel: number): number =>
  SECURE_CONTAINER_SLOTS_BY_LEVEL[Math.min(3, hideoutLevel)] ?? 4;

// Level -> cumulative Workbench stat bonuses applied to all weapons.
export const WORKBENCH_LEVEL_BONUS: Record<number, { ergoBonus: number; recoilReduction: number }> = {
  1: { ergoBonus: 5, recoilReduction: 0.03 },
  2: { ergoBonus: 3, recoilReduction: 0.03 },
  3: { ergoBonus: 4, recoilReduction: 0.04 },
};

// Level -> Shooting Range accuracy bonus (skill points added to Weapon Skill).
export const SHOOTING_RANGE_BONUS: Record<number, number> = { 0: 0, 1: 1, 2: 3, 3: 6 };

// Level -> Intelligence Center XP multiplier. Applied at level 1+.
export const XP_INTEL_MULTIPLIER_BY_LEVEL: Record<number, number> = { 1: 1.05, 2: 1.1, 3: 1.15 };

// Fallback for levels past the XP table (matching the old ternary's cap).
export const XP_INTEL_MULTIPLIER_DEFAULT = 1.15;

// Hideout Nutrition Unit (level >= NUTRITION_UNIT_DECAY_ACTIVE_FROM_LEVEL)
// reduces raid nutrition decay by this factor.
export const NUTRITION_UNIT_DECAY_RATE = 0.8;
export const NUTRITION_UNIT_DECAY_ACTIVE_FROM_LEVEL = 3;
