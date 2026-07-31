import { describe, it, expect } from 'vitest';
import {
  XP_KILL_BASE,
  XP_LOOT_VALUE_DIVISOR,
  XP_EXTRACTION_BONUS_MULTIPLIER,
  XP_INTEL_MULTIPLIER_BY_LEVEL,
  XP_PER_LEVEL,
  PERCEPTION_XP_GAIN,
  ACTIVE_QUEST_POOL_SIZE,
} from './progressionConfig';

describe('progressionConfig tuning locks', () => {
  it('base XP formula and extraction bonus', () => {
    expect(XP_KILL_BASE).toBe(10);
    expect(XP_LOOT_VALUE_DIVISOR).toBe(10);
    expect(XP_EXTRACTION_BONUS_MULTIPLIER).toBe(1.25);
  });

  it('intelligence center XP multipliers by level', () => {
    expect(XP_INTEL_MULTIPLIER_BY_LEVEL).toEqual({ 1: 1.05, 2: 1.1, 3: 1.15 });
  });

  it('leveling, perception gain, and quest pool', () => {
    expect(XP_PER_LEVEL).toBe(200);
    expect(PERCEPTION_XP_GAIN).toBe(25);
    expect(ACTIVE_QUEST_POOL_SIZE).toBe(5);
  });
});
