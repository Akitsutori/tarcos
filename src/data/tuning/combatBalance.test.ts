import { describe, it, expect } from 'vitest';
import { ClassType } from '../../types';
import { CLASS_PASSIVES, ClassPassiveConfig } from './combatBalance';
import { getBurstRange, getSmgPenetration, getDodgeMultiplier, getDamageMultipliers, getFatalSurviveChance, getLuckyLootRolls, isFreeReloader, isSmgPassive } from '../../engine/behaviors/classPassives';

const ALL_CLASS_TYPES = Object.values(ClassType);

describe('combatBalance class passives', () => {
  it('defines a config entry for every ClassType', () => {
    for (const classType of ALL_CLASS_TYPES) {
      expect(CLASS_PASSIVES[classType]).toBeDefined();
    }
  });

  it('SOLDIER boosts outgoing damage and reduces incoming damage', () => {
    expect(CLASS_PASSIVES[ClassType.SOLDIER]).toEqual({ outgoingDamageMultiplier: 1.2, incomingDamageMultiplier: 0.85 });
    expect(getDamageMultipliers(ClassType.SOLDIER)).toEqual({ outgoing: 1.2, incoming: 0.85 });
  });

  it('SCOUT has the SMG burst, penetration, and dodge passives', () => {
    const passive: ClassPassiveConfig = CLASS_PASSIVES[ClassType.SCOUT];
    expect(passive.burstRange).toEqual({ min: 3, max: 7 });
    expect(passive.smgPenetration).toBe(32);
    expect(passive.dodgeMultiplier).toBe(2.0);
    expect(isSmgPassive(ClassType.SCOUT)).toBe(true);
    expect(getBurstRange(ClassType.SCOUT)).toEqual({ min: 3, max: 7 });
    expect(getSmgPenetration(ClassType.SCOUT, 20)).toBe(32);
    expect(getDodgeMultiplier(ClassType.SCOUT)).toBe(2.0);
  });

  it('SURVIVOR has the free reload passive', () => {
    expect(CLASS_PASSIVES[ClassType.SURVIVOR]).toEqual({ freeReload: true });
    expect(isFreeReloader(ClassType.SURVIVOR)).toBe(true);
  });

  it('LUCKY has the survival, loot, and starting armor passives', () => {
    const passive: ClassPassiveConfig = CLASS_PASSIVES[ClassType.LUCKY];
    expect(passive.fatalSurviveChance).toBe(0.15);
    expect(passive.luckyLootRolls).toBe(1);
    expect(passive.startingArmorId).toBe('armor_6b23');
    expect(getFatalSurviveChance(ClassType.LUCKY)).toBe(0.15);
    expect(getLuckyLootRolls(ClassType.LUCKY)).toBe(1);
  });

  it('MARKSMAN and non-passive classes fall back to baseline behavior', () => {
    for (const classType of [ClassType.MARKSMAN, ClassType.SOLDIER, ClassType.SCOUT, ClassType.SURVIVOR, ClassType.LUCKY]) {
      if (classType !== ClassType.SURVIVOR) expect(isFreeReloader(classType)).toBe(false);
      if (classType !== ClassType.SCOUT) expect(isSmgPassive(classType)).toBe(false);
      if (classType !== ClassType.LUCKY) {
        expect(getFatalSurviveChance(classType)).toBe(0);
        expect(getLuckyLootRolls(classType)).toBe(0);
      }
    }
    expect(getBurstRange(ClassType.MARKSMAN)).toEqual({ min: 1, max: 5 });
    expect(getSmgPenetration(ClassType.MARKSMAN, 20)).toBe(20);
    expect(getDodgeMultiplier(ClassType.MARKSMAN)).toBe(1.0);
    expect(getDamageMultipliers(ClassType.MARKSMAN)).toEqual({ outgoing: 1.0, incoming: 1.0 });
    expect(CLASS_PASSIVES[ClassType.MARKSMAN]).toEqual({});
  });
});
