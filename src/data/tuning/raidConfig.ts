/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Raid survival tuning: time advancement, nutrition decay rates, and
 * hydration status thresholds. Single source of truth for the sim tick
 * (imported by raidSimulation.ts and maintenance.ts).
 */

// Time advancement per tick: elapsedSeconds += TICK_SECONDS_MIN + floor(rand * TICK_SECONDS_MAX)
export const TICK_SECONDS_MIN = 12;
export const TICK_SECONDS_MAX = 8;

// Per-tick nutrition decay probabilities (multiplied by drain modifier)
export const ENERGY_DECAY_CHANCE = 0.25;
export const HYDRATION_DECAY_CHANCE = 0.30;

// Hideout Nutrition Unit (level >= 3) reduces decay by this factor
export const NUTRITION_UNIT_DECAY_RATE = 0.8;

// Constitution skill reduces decay by SKILL_DECAY_REDUCTION_PER_LEVEL per level, floored at MIN
export const SKILL_DECAY_REDUCTION_PER_LEVEL = 0.015;
export const SKILL_DECAY_REDUCTION_MIN = 0.5;

// Hydration status bands (crossing below a band triggers its warning / fatality)
export const HYDRATION_STATUS = {
  THIRSTY: 50,
  SEVERE: 25,
  FATAL: 0,
} as const;

// Probability of emitting the thirsty / severely-dehydrated warning log per tick
export const STATUS_WARNING_CHANCE = 0.15;

// Hydration drained at the end of the maintenance phase: MIN + floor(rand * MAX)
export const MAINTENANCE_HYDRATION_DRAIN_MIN = 3;
export const MAINTENANCE_HYDRATION_DRAIN_MAX = 5;

// PMC will auto-consume a provision below this hydration level
export const PROVISION_DRINK_THRESHOLD = HYDRATION_STATUS.THIRSTY;
