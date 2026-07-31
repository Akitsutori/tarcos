/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, Weapon, ClassType, HideoutModule, Skill, CharacterSkills, PMCCharacter, Hideout, PMCBodyParts } from "./types";
import { CLASS_PASSIVES } from "./data/tuning/combatBalance";
import { XP_PER_LEVEL } from "./data/tuning/progressionConfig";

// Content barrel — static game data lives in src/data/content/*
export { ALL_ITEMS } from "./data/content/items";
export { ROOM_TEMPLATES, ALL_MAPS, buildProceduralMap } from "./data/content/maps";
export { INITIAL_WEAPONS } from "./data/content/weapons";
export { ALL_QUESTS } from "./data/content/quests";

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

// Create Initial Hideout
export const createInitialHideout = (): Hideout => {
  const makeModule = (id: string, name: string, desc: string, icon: string, u1Bonus: string, u2Bonus: string, u3Bonus: string, reqs: { [lvl: number]: { cost: number, reqItems: { itemId: string; quantity: number }[] } }): HideoutModule => {
    return {
      id,
      name,
      description: desc,
      level: 0,
      maxLevel: 3,
      iconName: icon,
      upgrades: {
        1: { cost: reqs[1].cost, requirements: reqs[1].reqItems, bonus: u1Bonus },
        2: { cost: reqs[2].cost, requirements: reqs[2].reqItems, bonus: u2Bonus },
        3: { cost: reqs[3].cost, requirements: reqs[3].reqItems, bonus: u3Bonus }
      }
    };
  };

  return {
    medstation: makeModule(
      "medstation", "Medstation", "Craft medkits and passive health recovery station.", "HeartPulse",
      "Passive HP regeneration: +2 HP per tick out of raid",
      "Craft advanced medical supplies & +5 HP per tick out of raid",
      "Powerful passive HP regeneration: +12 HP per tick out of raid",
      {
        1: { cost: 15000, reqItems: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }] },
        2: { cost: 50000, reqItems: [{ itemId: "bolts", quantity: 4 }, { itemId: "nuts", quantity: 4 }, { itemId: "hose", quantity: 2 }] },
        3: { cost: 120000, reqItems: [{ itemId: "hose", quantity: 4 }, { itemId: "circuit_board", quantity: 2 }, { itemId: "car_battery", quantity: 1 }] }
      }
    ),
    workbench: makeModule(
      "workbench", "Workbench", "Enables advanced weapon modification stat tuning and ammo assembly.", "Hammer",
      "+5 Weapon Ergonomics and -3% Recoil across all weapons",
      "+8 Weapon Ergonomics and -6% Recoil across all weapons",
      "+12 Weapon Ergonomics and -10% Recoil on all weapons",
      {
        1: { cost: 20000, reqItems: [{ itemId: "bolts", quantity: 3 }, { itemId: "spark_plug", quantity: 2 }] },
        2: { cost: 65000, reqItems: [{ itemId: "cpu_fan", quantity: 4 }, { itemId: "circuit_board", quantity: 3 }, { itemId: "wd40", quantity: 1 }] },
        3: { cost: 180000, reqItems: [{ itemId: "circuit_board", quantity: 5 }, { itemId: "gpu", quantity: 1 }, { itemId: "wd40", quantity: 2 }] }
      }
    ),
    intelligenceCenter: makeModule(
      "intelligenceCenter", "Intelligence Center", "Reduces scav raid timers, increases raid rouble yield and search speed.", "FileText",
      "+5% Experience gain from all sources",
      "+10% Experience gain & Secure Container capacity increased (6 slots)",
      "+15% Experience gain & Secure Container size increased to Gamma (9 slots)",
      {
        1: { cost: 30000, reqItems: [{ itemId: "circuit_board", quantity: 2 }, { itemId: "cpu_fan", quantity: 2 }] },
        2: { cost: 90000, reqItems: [{ itemId: "cpu", quantity: 3 }, { itemId: "ledger", quantity: 1 }] },
        3: { cost: 250000, reqItems: [{ itemId: "gpu", quantity: 1 }, { itemId: "ledger", quantity: 2 }, { itemId: "car_battery", quantity: 1 }] }
      }
    ),
    shootingRange: makeModule(
      "shootingRange", "Shooting Range", "Training ground. Increases PMC weapon skill through live practice.", "Target",
      "+1 Weapon Skill point",
      "+2 additional Weapon Skill points (total +3)",
      "+3 additional Weapon Skill points (total +6)",
      {
        1: { cost: 180000, reqItems: [{ itemId: "bolts", quantity: 5 }, { itemId: "nuts", quantity: 5 }] },
        2: { cost: 75000, reqItems: [{ itemId: "bolts", quantity: 10 }, { itemId: "nuts", quantity: 10 }, { itemId: "wd40", quantity: 1 }] },
        3: { cost: 150000, reqItems: [{ itemId: "hose", quantity: 3 }, { itemId: "car_battery", quantity: 1 }] }
      }
    ),
    nutritionUnit: makeModule(
      "nutritionUnit", "Nutrition Unit", "Ensures PMC food and hydration decays slower and recovers faster.", "Apple",
      "Passive energy and hydration recovery: +2 per tick out of raid",
      "Passive energy and hydration recovery: +4 per tick out of raid",
      "Hunger and Hydration decay 20% slower in raids",
      {
        1: { cost: 12000, reqItems: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }] },
        2: { cost: 45000, reqItems: [{ itemId: "hose", quantity: 2 }, { itemId: "cpu_fan", quantity: 3 }] },
        3: { cost: 110000, reqItems: [{ itemId: "fuel_tank", quantity: 1 }, { itemId: "hose", quantity: 4 }] }
      }
    ),
    scavengerWorkstation: makeModule(
      "scavengerWorkstation", "Scavenger Workstation", "Salvages barter goods after every successful extraction.", "Wrench",
      "Salvages loose parts after extraction (+2 bolts)",
      "Improved salvaging: higher-value components recovered after extraction",
      "Advanced salvaging: rare electronics recovered after extraction",
      {
        1: { cost: 25000, reqItems: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }] },
        2: { cost: 60000, reqItems: [{ itemId: "circuit_board", quantity: 2 }, { itemId: "spark_plug", quantity: 2 }] },
        3: { cost: 150000, reqItems: [{ itemId: "wd40", quantity: 2 }, { itemId: "cpu", quantity: 1 }] }
      }
    )
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
  if (workbenchLevel >= 1) {
    ergo += 5;
    recoil = Math.max(10, recoil - Math.floor(recoil * 0.03));
  }
  if (workbenchLevel >= 2) {
    ergo += 3;
    recoil = Math.max(10, recoil - Math.floor(recoil * 0.03));
  }
  if (workbenchLevel >= 3) {
    ergo += 4;
    recoil = Math.max(10, recoil - Math.floor(recoil * 0.04));
  }

  return {
    ergo: Math.min(100, Math.max(10, ergo)),
    recoil: Math.max(15, recoil),
    dmg,
    accuracy: Math.min(100, accuracy + Math.floor(ergo / 5)), // ergonomics gives weapon accuracy bonuses
    critBonus
  };
};
