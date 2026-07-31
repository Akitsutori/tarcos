/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PMC class-passive strategy registry. Engine orchestrators (combat.ts,
 * raidSimulation.ts, data.ts) read passive behavior through these typed
 * accessors instead of inline `classType === ClassType.X` conditionals.
 * All balance values live in src/data/tuning/combatBalance.ts.
 */

import { ClassType } from "../../types";
import { CLASS_PASSIVES, ClassPassiveConfig } from "../../data/tuning/combatBalance";

export const getClassPassive = (classType: ClassType): ClassPassiveConfig =>
  CLASS_PASSIVES[classType] ?? {};

export const isFreeReloader = (classType: ClassType): boolean =>
  getClassPassive(classType).freeReload === true;

export const isSmgPassive = (classType: ClassType): boolean =>
  getClassPassive(classType).burstRange != null;

export const getBurstRange = (classType: ClassType): { min: number; max: number } =>
  getClassPassive(classType).burstRange ?? { min: 1, max: 5 };

export const getSmgPenetration = (classType: ClassType, baseline: number): number =>
  getClassPassive(classType).smgPenetration ?? baseline;

export const getDodgeMultiplier = (classType: ClassType): number =>
  getClassPassive(classType).dodgeMultiplier ?? 1.0;

export const getDamageMultipliers = (classType: ClassType): { outgoing: number; incoming: number } => {
  const passive = getClassPassive(classType);
  return {
    outgoing: passive.outgoingDamageMultiplier ?? 1.0,
    incoming: passive.incomingDamageMultiplier ?? 1.0,
  };
};

export const getFatalSurviveChance = (classType: ClassType): number =>
  getClassPassive(classType).fatalSurviveChance ?? 0;

export const getLuckyLootRolls = (classType: ClassType): number =>
  getClassPassive(classType).luckyLootRolls ?? 0;
