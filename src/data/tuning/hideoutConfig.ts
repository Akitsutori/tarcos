/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hideout module tuning. Consumed by the Scavenger Workstation ModuleInstance
 * (engine/behaviors/hideoutModules.ts): the level-scaled per-extraction
 * STASH_ADD reward table, the production cooldown measured in raids, and the
 * deterministic quantity formula that scales the reward with PMC Perception
 * level and the raid map's loot multiplier.
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
