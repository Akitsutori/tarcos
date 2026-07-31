/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Loot-generation tuning constants consumed by the loot engine (loot.ts).
 * Values preserved exactly from the pre-extraction engine (byte-parity with
 * the Golden Master transcripts).
 */

// Rarity weighting for the loot table — all items share these weights,
// no per-item weights.
export const LOOT_RARITY_WEIGHT: Record<string, number> = {
  common: 5,
  rare: 3,
  epic: 2,
  legendary: 1,
};

export const LOOT_BASE_CHANCE = 0.5;
export const LOOT_CHANCE_CAP = 0.95;
export const LOOT_PERCEPTION_PER_LEVEL = 0.01;
export const LOOT_BASE_ROLLS = 3;

export const BACKPACK_CAPACITY_BASE = 9;
export const BACKPACK_CAPACITY_CONSTITUTION_FACTOR = 30;
