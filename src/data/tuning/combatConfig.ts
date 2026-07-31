/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Flat combat-tuning constants consumed by the combat engine (combat.ts).
 * Everything here was previously hardcoded inline; values are preserved
 * exactly (byte-parity with the Golden Master transcripts).
 */

// Initiative
export const INITIATIVE_DIE = 20;

// Accuracy model (calculateAccuracy)
export const ACCURACY_MIN = 5;
export const ACCURACY_MAX = 95;
export const ACCURACY_WEAPON_WEIGHT = 0.5;
export const ACCURACY_SKILL_WEIGHT = 1.0;
export const COVER_ACCURACY_PENALTY = 20;
export const HYDRATION_PENALTY_BANDS = [
  { below: 25, penalty: 10 },
  { below: 50, penalty: 5 },
] as const;

// Action selection
export const FLEE_CHANCE_BASE = 0.3;
export const FLEE_CHANCE_AGILITY_PER_LEVEL = 0.02;
export const COVER_CHANCE = 0.4;

// Burst fire
export const DEFAULT_BURST_RANGE = { min: 1, max: 5 };
export const BURST_DECAY_PMC = 2.5;
export const BURST_DECAY_ENEMY = 3.0;

// Ballistics
export const DEFAULT_BULLET_PENETRATION = 20;
export const CALIBER_PENETRATION: Record<string, number> = {
  "7.62x39mm": 34,
  "9x19mm": 20,
  "12x70mm": 18,
  "7.62x54mm": 45,
  "9x18mm": 15,
};

// Armor interaction
export const ARMOR_THRESHOLD_MULTIPLIER = 10;
export const ARMOR_BLOCK_DAMAGE_MULTIPLIER = 0.2;
export const ARMOR_PENETRATE_DAMAGE_MULTIPLIER = 0.6;
export const ARMOR_BLOCK_DURABILITY_LOSS = 5;
export const ARMOR_PENETRATE_DURABILITY_LOSS = 10;

// Dodge
export const DODGE_AGILITY_FACTOR = 0.0025;

// Bleeding
export const BLEED_TICK_BASE_DAMAGE = 5;
export const BLEED_TICK_CONSTITUTION_FACTOR = 0.01;
export const BLEED_TICK_MIN_DAMAGE = 1;
export const BLEED_CHANCE_BASE = 35;
export const BLEED_CHANCE_MIN = 5;
export const BLEED_CHANCE_CONSTITUTION_PER_LEVEL = 1.0;
export const BLEED_CHANCE_HYDRATION_MODS = [
  { below: 25, bonus: 10 },
  { below: 50, bonus: 5 },
] as const;
