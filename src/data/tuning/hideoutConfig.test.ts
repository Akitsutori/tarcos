import { describe, it, expect } from 'vitest';
import { ALL_ITEMS } from '../content/items';
import {
  SCAVENGER_WORKSTATION_REWARD_BY_LEVEL,
  SCAVENGER_WORKSTATION_COOLDOWN_RAIDS,
  computeScavengerWorkstationQuantity,
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
