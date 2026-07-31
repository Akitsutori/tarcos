import { describe, it, expect } from 'vitest';
import {
  INITIATIVE_DIE,
  ACCURACY_MIN,
  ACCURACY_MAX,
  ACCURACY_WEAPON_WEIGHT,
  ACCURACY_SKILL_WEIGHT,
  SHOOTING_RANGE_BONUS,
  COVER_ACCURACY_PENALTY,
  HYDRATION_PENALTY_BANDS,
  FLEE_CHANCE_BASE,
  FLEE_CHANCE_AGILITY_PER_LEVEL,
  COVER_CHANCE,
  DEFAULT_BURST_RANGE,
  BURST_DECAY_PMC,
  BURST_DECAY_ENEMY,
  DEFAULT_BULLET_PENETRATION,
  CALIBER_PENETRATION,
  ARMOR_THRESHOLD_MULTIPLIER,
  ARMOR_BLOCK_DAMAGE_MULTIPLIER,
  ARMOR_PENETRATE_DAMAGE_MULTIPLIER,
  ARMOR_BLOCK_DURABILITY_LOSS,
  ARMOR_PENETRATE_DURABILITY_LOSS,
  DODGE_AGILITY_FACTOR,
  BLEED_TICK_BASE_DAMAGE,
  BLEED_TICK_CONSTITUTION_FACTOR,
  BLEED_TICK_MIN_DAMAGE,
  BLEED_CHANCE_BASE,
  BLEED_CHANCE_MIN,
  BLEED_CHANCE_CONSTITUTION_PER_LEVEL,
  BLEED_CHANCE_HYDRATION_MODS,
} from './combatConfig';

describe('combatConfig tuning locks', () => {
  it('ballistics: caliber penetration table and default', () => {
    expect(DEFAULT_BULLET_PENETRATION).toBe(20);
    expect(CALIBER_PENETRATION).toEqual({
      "7.62x39mm": 34,
      "9x19mm": 20,
      "12x70mm": 18,
      "7.62x54mm": 45,
      "9x18mm": 15,
    });
  });

  it('armor interaction: threshold, damage multipliers, and durability loss', () => {
    expect(ARMOR_THRESHOLD_MULTIPLIER).toBe(10);
    expect(ARMOR_BLOCK_DAMAGE_MULTIPLIER).toBe(0.2);
    expect(ARMOR_PENETRATE_DAMAGE_MULTIPLIER).toBe(0.6);
    expect(ARMOR_BLOCK_DURABILITY_LOSS).toBe(5);
    expect(ARMOR_PENETRATE_DURABILITY_LOSS).toBe(10);
  });

  it('accuracy model: clamps, weights, cover/hydration penalties', () => {
    expect(ACCURACY_MIN).toBe(5);
    expect(ACCURACY_MAX).toBe(95);
    expect(ACCURACY_WEAPON_WEIGHT).toBe(0.5);
    expect(ACCURACY_SKILL_WEIGHT).toBe(1.0);
    expect(SHOOTING_RANGE_BONUS).toEqual({ 0: 0, 1: 1, 2: 3, 3: 6 });
    expect(COVER_ACCURACY_PENALTY).toBe(20);
    expect(HYDRATION_PENALTY_BANDS).toEqual([
      { below: 25, penalty: 10 },
      { below: 50, penalty: 5 },
    ]);
  });

  it('action selection and burst fire', () => {
    expect(INITIATIVE_DIE).toBe(20);
    expect(FLEE_CHANCE_BASE).toBe(0.3);
    expect(FLEE_CHANCE_AGILITY_PER_LEVEL).toBe(0.02);
    expect(COVER_CHANCE).toBe(0.4);
    expect(DEFAULT_BURST_RANGE).toEqual({ min: 1, max: 5 });
    expect(BURST_DECAY_PMC).toBe(2.5);
    expect(BURST_DECAY_ENEMY).toBe(3.0);
  });

  it('bleeding: tick damage, bleed chance, and hydration modifiers', () => {
    expect(BLEED_TICK_BASE_DAMAGE).toBe(5);
    expect(BLEED_TICK_CONSTITUTION_FACTOR).toBe(0.01);
    expect(BLEED_TICK_MIN_DAMAGE).toBe(1);
    expect(BLEED_CHANCE_BASE).toBe(35);
    expect(BLEED_CHANCE_MIN).toBe(5);
    expect(BLEED_CHANCE_CONSTITUTION_PER_LEVEL).toBe(1.0);
    expect(BLEED_CHANCE_HYDRATION_MODS).toEqual([
      { below: 25, bonus: 10 },
      { below: 50, bonus: 5 },
    ]);
  });

  it('dodge uses the agility factor constant', () => {
    expect(DODGE_AGILITY_FACTOR).toBe(0.0025);
  });
});
