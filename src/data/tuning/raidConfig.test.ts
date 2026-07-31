import { describe, it, expect } from 'vitest';
import { TICK_SECONDS_MIN, TICK_SECONDS_MAX, ENERGY_DECAY_CHANCE, HYDRATION_DECAY_CHANCE, NUTRITION_UNIT_DECAY_RATE, SKILL_DECAY_REDUCTION_PER_LEVEL, SKILL_DECAY_REDUCTION_MIN, HYDRATION_STATUS, STATUS_WARNING_CHANCE, MAINTENANCE_HYDRATION_DRAIN_MIN, MAINTENANCE_HYDRATION_DRAIN_MAX, PROVISION_DRINK_THRESHOLD } from './raidConfig';

describe('raidConfig', () => {
  it('tick advancement constants are positive', () => {
    expect(TICK_SECONDS_MIN).toBeGreaterThan(0);
    expect(TICK_SECONDS_MAX).toBeGreaterThan(0);
  });

  it('decay probabilities are within (0, 1]', () => {
    expect(ENERGY_DECAY_CHANCE).toBeGreaterThan(0);
    expect(ENERGY_DECAY_CHANCE).toBeLessThanOrEqual(1);
    expect(HYDRATION_DECAY_CHANCE).toBeGreaterThan(0);
    expect(HYDRATION_DECAY_CHANCE).toBeLessThanOrEqual(1);
    expect(STATUS_WARNING_CHANCE).toBeGreaterThan(0);
    expect(STATUS_WARNING_CHANCE).toBeLessThanOrEqual(1);
  });

  it('decay reduction modifiers are sane', () => {
    expect(NUTRITION_UNIT_DECAY_RATE).toBeGreaterThan(0);
    expect(NUTRITION_UNIT_DECAY_RATE).toBeLessThanOrEqual(1);
    expect(SKILL_DECAY_REDUCTION_PER_LEVEL).toBeGreaterThan(0);
    expect(SKILL_DECAY_REDUCTION_MIN).toBeGreaterThan(0);
    expect(SKILL_DECAY_REDUCTION_MIN).toBeLessThan(1);
  });

  it('hydration status bands are ordered and drive the drink threshold', () => {
    expect(HYDRATION_STATUS.THIRSTY).toBeGreaterThan(HYDRATION_STATUS.SEVERE);
    expect(HYDRATION_STATUS.SEVERE).toBeGreaterThan(HYDRATION_STATUS.FATAL);
    expect(HYDRATION_STATUS.FATAL).toBe(0);
    expect(PROVISION_DRINK_THRESHOLD).toBe(HYDRATION_STATUS.THIRSTY);
  });

  it('maintenance hydration drain spans a positive range', () => {
    expect(MAINTENANCE_HYDRATION_DRAIN_MIN).toBeGreaterThan(0);
    expect(MAINTENANCE_HYDRATION_DRAIN_MAX).toBeGreaterThan(MAINTENANCE_HYDRATION_DRAIN_MIN);
  });
});
