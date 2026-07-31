/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassType, GameItem, Weapon } from "../../types";
import { INITIAL_WEAPONS, ALL_ITEMS } from "../../data";

/**
 * Enemy spawn tuning: per-tier spawn profiles consumed by engine/spawning.ts.
 * The spawn algorithm (including its Math.random() call sequence) lives in
 * engine/spawning.ts; these tables are the single source of truth for values.
 */

export type EnemyTier = "Scav" | "PMC" | "Boss";

type StatRange = [number, number];

export type LevelConfig =
  | { mode: "add"; amount: number; max: number }
  | { mode: "delta"; rollRange: number; offset: number; min: number; max: number }
  | { mode: "subtract"; rollRange: number; offset: number; min: number };

export type WeaponConfig =
  | { mode: "pool"; pool: ClassType[] }
  | { mode: "choice"; chance: number; chosen: ClassType; fallback: ClassType }
  | { mode: "split"; pistolChance: number; pistol: Weapon; pool: ClassType[] };

export type EquipmentConfig = {
  gate?: number;
  pick: "coin" | "index" | "single";
  pool: GameItem[];
};

export type EnemySpawnProfile = {
  names: string[];
  level: LevelConfig;
  statRanges: {
    initiative: StatRange;
    agility: StatRange;
    weaponSkill: StatRange;
    perception: StatRange;
    constitution: StatRange;
  };
  baseAccuracy: number;
  weapon: WeaponConfig;
  armor: EquipmentConfig;
  helmet: EquipmentConfig;
};

// Scav's fallback sidearm (not part of INITIAL_WEAPONS)
const SCAV_PISTOL: Weapon = {
  id: "pistol",
  name: "Pistol (9x18mm)",
  baseErgo: 40,
  baseRecoil: 50,
  baseDmg: 25,
  baseAccuracy: 40,
  mods: {},
  signatureClass: ClassType.LUCKY,
  caliber: "9x18mm",
  currentMagRounds: 8,
  maxMagSize: 8,
  reserveMags: 2,
  maxReserveMags: 2,
};

export const ENEMY_SPAWN_PROFILES: Record<EnemyTier, EnemySpawnProfile> = {
  Boss: {
    names: [],
    level: { mode: "add", amount: 5, max: 65 },
    statRanges: {
      initiative: [13, 17],
      agility: [11, 15],
      weaponSkill: [15, 20],
      perception: [11, 14],
      constitution: [6, 9],
    },
    baseAccuracy: 40,
    weapon: { mode: "pool", pool: [ClassType.SOLDIER, ClassType.MARKSMAN, ClassType.LUCKY] },
    armor: { pick: "coin", pool: [ALL_ITEMS.armor_killa, ALL_ITEMS.armor_glukhar] },
    helmet: { pick: "coin", pool: [ALL_ITEMS.altyn, ALL_ITEMS.helmet_6b47] },
  },
  PMC: {
    names: ["Ghost", "Hammer", "Viking", "Frost", "Viper", "Raven", "Slayer", "Sherpa", "DormChad"],
    level: { mode: "delta", rollRange: 11, offset: -5, min: 1, max: 60 },
    statRanges: {
      initiative: [10, 14],
      agility: [9, 13],
      weaponSkill: [11, 16],
      perception: [9, 12],
      constitution: [4, 7],
    },
    baseAccuracy: 30,
    weapon: { mode: "choice", chance: 0.25, chosen: ClassType.LUCKY, fallback: ClassType.SOLDIER },
    armor: { gate: 0.7, pick: "coin", pool: [ALL_ITEMS.armor_6b13, ALL_ITEMS.armor_6b13_heavy] },
    helmet: { gate: 0.6, pick: "index", pool: [ALL_ITEMS.helmet_6b47, ALL_ITEMS.ulach, ALL_ITEMS.fast_mt, ALL_ITEMS.tor_team] },
  },
  Scav: {
    names: ["Bomzh", "Gopnik", "Tushonka", "Ded", "Cheeki", "Breeki", "Serega", "Kolya", "Morozov"],
    level: { mode: "subtract", rollRange: 11, offset: 5, min: 1 },
    statRanges: {
      initiative: [8, 12],
      agility: [7, 11],
      weaponSkill: [1, 5],
      perception: [7, 11],
      constitution: [2, 5],
    },
    baseAccuracy: 30,
    weapon: { mode: "split", pistolChance: 0.5, pistol: SCAV_PISTOL, pool: [ClassType.SURVIVOR, ClassType.SCOUT, ClassType.SOLDIER] },
    armor: { gate: 0.4, pick: "single", pool: [ALL_ITEMS.paca] },
    helmet: { gate: 0.2, pick: "coin", pool: [ALL_ITEMS.untar, ALL_ITEMS.ssh68] },
  },
};

// Stat scaling applied per enemy level above 1
export const LEVEL_STAT_SCALE = 0.15;

// Raid-level spawn tuning (consumed by raidSimulation.ts)
export const ENCOUNTER_CHANCE = 0.25;
export const REINFORCEMENT_MAX_PER_TILE = 3;
export const REINFORCEMENT_CHANCE = 0.3;
