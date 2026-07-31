import { describe, it, expect } from 'vitest';
import {
  LOOT_RARITY_WEIGHT,
  LOOT_BASE_CHANCE,
  LOOT_CHANCE_CAP,
  LOOT_PERCEPTION_PER_LEVEL,
  LOOT_BASE_ROLLS,
  BACKPACK_CAPACITY_BASE,
  BACKPACK_CAPACITY_CONSTITUTION_FACTOR,
} from './lootConfig';

describe('lootConfig tuning locks', () => {
  it('rarity weighting drives the loot table', () => {
    expect(LOOT_RARITY_WEIGHT).toEqual({
      common: 5,
      rare: 3,
      epic: 2,
      legendary: 1,
    });
  });

  it('loot phase chances and roll counts', () => {
    expect(LOOT_BASE_CHANCE).toBe(0.5);
    expect(LOOT_CHANCE_CAP).toBe(0.95);
    expect(LOOT_PERCEPTION_PER_LEVEL).toBe(0.01);
    expect(LOOT_BASE_ROLLS).toBe(3);
  });

  it('backpack capacity formula constants', () => {
    expect(BACKPACK_CAPACITY_BASE).toBe(9);
    expect(BACKPACK_CAPACITY_CONSTITUTION_FACTOR).toBe(30);
  });
});
