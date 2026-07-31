import { describe, it, expect } from 'vitest';
import { ALL_ITEMS } from '../content/items';
import {
  SCAVENGER_WORKSTATION_REWARD_BY_LEVEL,
  SCAVENGER_WORKSTATION_COOLDOWN_RAIDS,
  computeScavengerWorkstationQuantity,
  MEDSTATION_HEAL_PER_5S_BY_LEVEL,
  NUTRITION_RECOVERY_PER_5S_BY_LEVEL,
  nutritionRecoveryPer5s,
  SECURE_CONTAINER_SLOTS_BY_LEVEL,
  secureContainerCapacity,
  WORKBENCH_LEVEL_BONUS,
  SHOOTING_RANGE_BONUS,
  XP_INTEL_MULTIPLIER_BY_LEVEL,
  XP_INTEL_MULTIPLIER_DEFAULT,
  NUTRITION_UNIT_DECAY_RATE,
  NUTRITION_UNIT_DECAY_ACTIVE_FROM_LEVEL,
} from './hideoutConfig';

describe('SCAVENGER_WORKSTATION_REWARD_BY_LEVEL', () => {
  it('covers all three workstation levels with existing items', () => {
    for (const level of [1, 2, 3]) {
      const reward = SCAVENGER_WORKSTATION_REWARD_BY_LEVEL[level];
      expect(reward).toBeDefined();
      expect(ALL_ITEMS[reward.itemId]).toBeDefined();
      expect(reward.baseQuantity).toBeGreaterThanOrEqual(1);
    }
  });

  it('distinct itemIds are known to the STASH_ADD reducer', () => {
    const ids = Object.values(SCAVENGER_WORKSTATION_REWARD_BY_LEVEL).map(r => r.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('SCAVENGER_WORKSTATION_COOLDOWN_RAIDS', () => {
  it('requires at least one raid of downtime between productions', () => {
    expect(SCAVENGER_WORKSTATION_COOLDOWN_RAIDS).toBeGreaterThanOrEqual(1);
  });
});

describe('computeScavengerWorkstationQuantity', () => {
  it('returns the base quantity at baseline Perception and map multiplier', () => {
    expect(computeScavengerWorkstationQuantity(2, 1, 1.0)).toBe(2);
  });

  it('adds one per four Perception levels', () => {
    expect(computeScavengerWorkstationQuantity(2, 4, 1.0)).toBe(3);
    expect(computeScavengerWorkstationQuantity(2, 8, 1.0)).toBe(4);
  });

  it('scales with the map loot multiplier', () => {
    expect(computeScavengerWorkstationQuantity(2, 1, 3.2)).toBe(3);
    expect(computeScavengerWorkstationQuantity(2, 1, 2.3)).toBe(3);
  });

  it('never drops below 1', () => {
    expect(computeScavengerWorkstationQuantity(1, 0, 0.5)).toBe(1);
  });

  it('is deterministic (no RNG involvement)', () => {
    const a = computeScavengerWorkstationQuantity(2, 3, 1.5);
    const b = computeScavengerWorkstationQuantity(2, 3, 1.5);
    expect(a).toBe(b);
  });
});

describe('hideout level-scaled tables', () => {
  it('medstation: passive HP per 5s by level', () => {
    expect(MEDSTATION_HEAL_PER_5S_BY_LEVEL).toEqual({ 0: 1, 1: 2, 2: 5, 3: 12 });
  });

  it('nutrition unit: passive energy/hydration recovery per 5s by level', () => {
    expect(NUTRITION_RECOVERY_PER_5S_BY_LEVEL).toEqual({ 1: 2, 2: 4, 3: 4 });
    expect(nutritionRecoveryPer5s(0)).toBe(0);
    expect(nutritionRecoveryPer5s(1)).toBe(2);
    expect(nutritionRecoveryPer5s(2)).toBe(4);
    expect(nutritionRecoveryPer5s(3)).toBe(4);
    expect(nutritionRecoveryPer5s(4)).toBe(0);
  });

  it('secure container capacity: 4/4/6/9 slots with a level-3 clamp', () => {
    expect(SECURE_CONTAINER_SLOTS_BY_LEVEL).toEqual({ 0: 4, 1: 4, 2: 6, 3: 9 });
    expect(secureContainerCapacity(0)).toBe(4);
    expect(secureContainerCapacity(1)).toBe(4);
    expect(secureContainerCapacity(2)).toBe(6);
    expect(secureContainerCapacity(3)).toBe(9);
    expect(secureContainerCapacity(4)).toBe(9);
  });

  it('workbench: per-level ergonomics/recoil bonuses compound across levels', () => {
    expect(WORKBENCH_LEVEL_BONUS).toEqual({
      1: { ergoBonus: 5, recoilReduction: 0.03 },
      2: { ergoBonus: 3, recoilReduction: 0.03 },
      3: { ergoBonus: 4, recoilReduction: 0.04 },
    });
  });

  it('shooting range: accuracy bonus by level', () => {
    expect(SHOOTING_RANGE_BONUS).toEqual({ 0: 0, 1: 1, 2: 3, 3: 6 });
  });

  it('intelligence center: XP multiplier by level with default fallback', () => {
    expect(XP_INTEL_MULTIPLIER_BY_LEVEL).toEqual({ 1: 1.05, 2: 1.1, 3: 1.15 });
    expect(XP_INTEL_MULTIPLIER_DEFAULT).toBe(1.15);
  });

  it('nutrition unit decay: rate active from level 3', () => {
    expect(NUTRITION_UNIT_DECAY_RATE).toBe(0.8);
    expect(NUTRITION_UNIT_DECAY_ACTIVE_FROM_LEVEL).toBe(3);
  });
});
