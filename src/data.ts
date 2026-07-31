/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, Weapon, ClassType, HideoutModule, Skill, CharacterSkills, PMCCharacter, Hideout, PMCBodyParts } from "./types";
import { CLASS_PASSIVES } from "./data/tuning/combatBalance";
import { XP_PER_LEVEL } from "./data/tuning/progressionConfig";
import { WORKBENCH_LEVEL_BONUS } from "./data/tuning/hideoutConfig";
import { HIDE_OUT_MODULE_DEFINITIONS, HIDE_OUT_MODULE_MAX_LEVEL, HideoutModuleDefinition } from "./data/content/hideout";

// Content barrel — static game data lives in src/data/content/*
export { ALL_ITEMS } from "./data/content/items";
export { ROOM_TEMPLATES, ALL_MAPS, buildProceduralMap } from "./data/content/maps";
export { INITIAL_WEAPONS } from "./data/content/weapons";
export { ALL_QUESTS } from "./data/content/quests";
export { HIDE_OUT_MODULE_DEFINITIONS, HIDE_OUT_MODULE_MAX_LEVEL } from "./data/content/hideout";

// Local import for construction logic below (PMC starting gear, etc.)
import { ALL_ITEMS } from "./data/content/items";

// Skill creation
const createSkill = (id: string, name: string, description: string, bonus: string): Skill => ({
  id, name, description, level: 5, xp: 0, maxXp: 100, bonusPerLevel: bonus
});

// GDD Skills (Section 13.3)
export const createInitialSkills = (): CharacterSkills => ({
  weaponSkill: createSkill("weaponSkill", "Weapon Skill", "Familiarity and combat precision.", "+1.0 Accuracy per point"),
  constitution: createSkill("constitution", "Constitution", "General physiological health.", "+3 HP to Head/Thorax, +1 HP to others per point"),
  perception: createSkill("perception", "Perception", "Environmental awareness.", "+1% loot chance per point"),
  initiative: createSkill("initiative", "Initiative", "Speeds up initial firefight reflexes.", "Higher value = act first in combat"),
  agility: createSkill("agility", "Agility", "Movement speed and reactive stance dodging.", "+0.25% dodge chance per point (doubled for Scout)")
});

// Constitution health calculation (GDD Section 6)
export const calculateBodyParts = (conLevel: number): PMCBodyParts => {
  const hpHead = 15 + 3 * conLevel;
  const hpThorax = 15 + 3 * conLevel;
  const hpOther = 15 + 1 * conLevel;

  return {
    head: { id: "head", name: "Head", current: hpHead, max: hpHead },
    thorax: { id: "thorax", name: "Thorax", current: hpThorax, max: hpThorax },
    stomach: { id: "stomach", name: "Stomach", current: hpOther, max: hpOther },
    leftArm: { id: "leftArm", name: "Left Arm", current: hpOther, max: hpOther },
    rightArm: { id: "rightArm", name: "Right Arm", current: hpOther, max: hpOther },
    leftLeg: { id: "leftLeg", name: "Left Leg", current: hpOther, max: hpOther },
    rightLeg: { id: "rightLeg", name: "Right Leg", current: hpOther, max: hpOther }
  };
};

// Archetype Skill Weight Distribution Tables (GDD Section 12.3)
export const ARCHETYPE_WEIGHTS = {
  [ClassType.SOLDIER]: { weaponSkill: 30, constitution: 25, perception: 15, initiative: 15, agility: 15 },
  [ClassType.SCOUT]: { weaponSkill: 20, constitution: 15, perception: 25, initiative: 20, agility: 20 },
  [ClassType.SURVIVOR]: { weaponSkill: 15, constitution: 30, perception: 20, initiative: 15, agility: 20 },
  [ClassType.MARKSMAN]: { weaponSkill: 30, constitution: 10, perception: 30, initiative: 15, agility: 15 },
  [ClassType.LUCKY]: { weaponSkill: 20, constitution: 20, perception: 20, initiative: 20, agility: 20 }
};

// Allocate skill points randomly based on weights
export const distributeStartingSkills = (classType: ClassType, skills: CharacterSkills, points = 25) => {
  const weights = ARCHETYPE_WEIGHTS[classType];
  const keys = Object.keys(weights) as (keyof typeof weights)[];

  // Normalize weights for random choice
  const sumWeights = keys.reduce((acc, k) => acc + weights[k], 0);

  for (let p = 0; p < points; p++) {
    let rand = Math.random() * sumWeights;
    for (const key of keys) {
      rand -= weights[key];
      if (rand <= 0) {
        skills[key].level++;
        break;
      }
    }
  }
};

// Create Initial PMC character
export const createInitialPMC = (classType: ClassType): PMCCharacter => {
  const skills = createInitialSkills();
  distributeStartingSkills(classType, skills, 25); // distribute 25 points on start

  const conLevel = skills.constitution.level;
  const bodyParts = calculateBodyParts(conLevel);

  // Setup starting equipment
  let startingArmor: GameItem | null = { ...ALL_ITEMS.armor_6b13 }; // Default 6B13 M
  let startingHelmet: GameItem | null = { ...ALL_ITEMS.ssh68 }; // Default SSH-68
  let startingMedkit: GameItem | null = { ...ALL_ITEMS.ai2 };
  let startingSurgical: GameItem | null = { ...ALL_ITEMS.cms_kit };
  let startingProvision: GameItem | null = { ...ALL_ITEMS.water_bottle };

  const startingArmorId = CLASS_PASSIVES[classType]?.startingArmorId ?? null;
  if (startingArmorId) {
    startingArmor = { ...ALL_ITEMS[startingArmorId] }; // e.g. LUCKY: armor_6b23 (Class 3)
  }

  return {
    classType,
    level: 1,
    xp: 0,
    maxXp: XP_PER_LEVEL, // Level 1 -> 2: 200 XP
    bodyParts,
    energy: 100,
    maxEnergy: 100,
    hydration: 100,
    maxHydration: 100,
    skills,
    survivalRate: 0,
    raidsCount: 0,
    survivedCount: 0,
    kiaCount: 0,
    killsCount: 0,
    equippedArmor: startingArmor,
    equippedHelmet: startingHelmet,
    equippedMedkit: startingMedkit,
    equippedSurgicalKit: startingSurgical,
    equippedProvision: startingProvision,
    isBleeding: false,
    isCovered: false,
    isDead: false
  };
};

// Create Initial Hideout (from static definitions in data/content/hideout)
export const createInitialHideout = (): Hideout => {
  const buildModule = (def: HideoutModuleDefinition): HideoutModule => ({
    id: def.id,
    name: def.name,
    description: def.description,
    level: 0,
    maxLevel: HIDE_OUT_MODULE_MAX_LEVEL,
    iconName: def.iconName,
    upgrades: def.upgrades,
  });

  return {
    medstation: buildModule(HIDE_OUT_MODULE_DEFINITIONS.medstation),
    workbench: buildModule(HIDE_OUT_MODULE_DEFINITIONS.workbench),
    intelligenceCenter: buildModule(HIDE_OUT_MODULE_DEFINITIONS.intelligenceCenter),
    shootingRange: buildModule(HIDE_OUT_MODULE_DEFINITIONS.shootingRange),
    nutritionUnit: buildModule(HIDE_OUT_MODULE_DEFINITIONS.nutritionUnit),
    scavengerWorkstation: buildModule(HIDE_OUT_MODULE_DEFINITIONS.scavengerWorkstation),
  };
};

// Get computed weapon stats (incorporating modifications and hideout workbench level)
export const getWeaponStats = (weapon: Weapon, workbenchLevel: number) => {
  if (!weapon) {
    return {
      ergo: 50,
      recoil: 100,
      dmg: 40,
      accuracy: 50,
      critBonus: 0
    };
  }
  let ergo = weapon.baseErgo || 50;
  let recoil = weapon.baseRecoil || 100;
  let dmg = weapon.baseDmg || 40;
  let accuracy = weapon.baseAccuracy || 50;
  let critBonus = 0;

  // Mod additions
  if (weapon.mods) {
    Object.values(weapon.mods).forEach((mod) => {
      if (mod) {
        if (mod.ergoBonus) ergo += mod.ergoBonus;
        if (mod.recoilReduction) recoil = Math.max(10, recoil - Math.floor((weapon.baseRecoil || 100) * (mod.recoilReduction / 100)));
        if (mod.dmgBonus) dmg += mod.dmgBonus;
        if (mod.critBonus) critBonus += mod.critBonus;
      }
    });
  }

  // Workbench levels
  for (let lvl = 1; lvl <= Math.min(HIDE_OUT_MODULE_MAX_LEVEL, workbenchLevel); lvl++) {
    const bonus = WORKBENCH_LEVEL_BONUS[lvl];
    if (!bonus) break;
    ergo += bonus.ergoBonus;
    recoil = Math.max(10, recoil - Math.floor(recoil * bonus.recoilReduction));
  }

  return {
    ergo: Math.min(100, Math.max(10, ergo)),
    recoil: Math.max(15, recoil),
    dmg,
    accuracy: Math.min(100, accuracy + Math.floor(ergo / 5)), // ergonomics gives weapon accuracy bonuses
    critBonus
  };
};
