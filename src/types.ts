/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ClassType {
  SOLDIER = "Soldier",
  SURVIVOR = "Survivor",
  MARKSMAN = "Marksman",
  SCOUT = "Scout",
  LUCKY = "Lucky"
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  xp: number;
  maxXp: number;
  bonusPerLevel: string;
}

export interface CharacterSkills {
  weaponSkill: Skill;
  constitution: Skill;
  perception: Skill;
  initiative: Skill;
  agility: Skill;
}

export interface BodyPart {
  id: string;
  name: string;
  current: number;
  max: number;
}

export interface PMCBodyParts {
  head: BodyPart;
  thorax: BodyPart;
  stomach: BodyPart;
  leftArm: BodyPart;
  rightArm: BodyPart;
  leftLeg: BodyPart;
  rightLeg: BodyPart;
}

export interface CombatantView {
  name: string;
  type: "pmc" | "enemy";
  level: number;
  bodyParts: PMCBodyParts;
  skills: CharacterSkills;
  baseAccuracy: number;
  hydration: number;
  equippedWeapon: Weapon;
  equippedArmor: GameItem | null;
  equippedHelmet: GameItem | null;
  isBleeding: boolean;
  isCovered: boolean;
  isDead: boolean;
}

export interface PMCCharacter {
  classType: ClassType;
  level: number;
  xp: number;
  maxXp: number;
  bodyParts: PMCBodyParts;
  energy: number;
  maxEnergy: number;
  hydration: number;
  maxHydration: number;
  skills: CharacterSkills;
  survivalRate: number;
  raidsCount: number;
  survivedCount: number;
  kiaCount: number;
  killsCount: number;

  // Equipped slots
  equippedArmor: GameItem | null;
  equippedHelmet: GameItem | null;
  equippedMedkit: GameItem | null;
  equippedSurgicalKit: GameItem | null;
  equippedProvision: GameItem | null;

  // Combat status (unified with EnemyState for structural typing)
  isBleeding: boolean;
  isCovered: boolean;
  isDead: boolean;
}

export type ItemType = "barter" | "medical" | "provision" | "weapon_mod" | "currency" | "ammo" | "armor" | "helmet" | "valuable" | "quest";

export interface GameItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: "common" | "rare" | "epic" | "legendary" | "quest";
  value: number; // in Roubles
  stackSize?: number;
  iconName: string; // Lucide icon mapping
  
  // Armor/Helmet specific properties
  armorClass?: number;
  durability?: number;
  maxDurability?: number;
  protectedZones?: string[];

  // Medical/Surgical/Provision specific properties
  resourceCurrent?: number;
  resourceMax?: number;

  // Provision sub-type
  provisionType?: "hydration" | "energy";

  // Medical effects
  hpHeal?: number;
  
  // Weapon mod properties
  modCategory?: WeaponModCategory;
  ergoBonus?: number;
  recoilReduction?: number; // as positive percentage e.g. 5 = -5% recoil
  dmgBonus?: number;
  critBonus?: number;

  // Ammunition caliber
  caliber?: string;

  // Trader shop data (if set, item is sold by this trader at this cost)
  soldBy?: string;    // e.g. "therapist", "mechanic"
  traderCost?: number; // purchase price in Roubles
}

export enum WeaponModCategory {
  SIGHT = "Sight",
  SUPPRESSOR = "Muzzle/Suppressor",
  GRIP = "Foregrip",
  MAGAZINE = "Magazine",
  STOCK = "Stock",
  HANDGUARD = "Handguard"
}

export interface Weapon {
  id: string;
  name: string;
  baseErgo: number;
  baseRecoil: number; // lower is better
  baseDmg: number;
  baseAccuracy: number; // percentage
  mods: {
    [key in WeaponModCategory]?: GameItem | null;
  };
  signatureClass: ClassType;
  caliber: string;
  currentMagRounds: number;
  maxMagSize: number;
  reserveMags: number;
  maxReserveMags: number;
}

export interface Stash {
  items: {
    item: GameItem;
    quantity: number;
  }[];
  roubles: number;
  weapons: Weapon[];
  equippedWeaponId: string;
}

export interface HideoutModule {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  upgrades: {
    [level: number]: {
      cost: number;
      requirements: { itemId: string; quantity: number }[];
      bonus: string;
    };
  };
  iconName: string;
}

export interface Hideout {
  medstation: HideoutModule;
  workbench: HideoutModule;
  intelligenceCenter: HideoutModule;
  shootingRange: HideoutModule;
  nutritionUnit: HideoutModule;
}

export interface MapData {
  id: string;
  name: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Insane";
  stagesCount: number; // Max rooms/stages to simulate
  scavSpawnChance: number;
  pmcSpawnChance: number;
  bossSpawnChance: number;
  bossName: string;
  lootMultiplier: number;
  levelRequired: number;
  color: string; // tailwind color prefix
}

export interface RaidLog {
  id: string;
  timestamp: string; // inside-raid elapsed time e.g. "04:12"
  message: string;
  type: "info" | "loot" | "combat_hit" | "combat_kill" | "combat_damage" | "combat_profile" | "combat_round" | "heal" | "extract" | "death" | "warning" | "status";
}

export interface RoomTile {
  name: string;
  description: string;
  type: string;
}

export interface EnemyState {
  name: string;
  tier: "Scav" | "PMC" | "Boss";
  level: number;
  bodyParts: PMCBodyParts;
  skills: CharacterSkills;
  baseAccuracy: number;
  equippedWeapon: Weapon;
  equippedArmor: GameItem | null;
  equippedHelmet: GameItem | null;
  isBleeding: boolean;
  isCovered: boolean;
  isDead: boolean;
}

export interface Quest {
  id: string;
  name: string;
  trader: "prapor" | "therapist" | "ragman";
  type: "Kill" | "Extract" | "Find" | "Collect" | "Valuables";
  target: string; // Target enemy name/tier or Item ID or Rouble count
  count: number;  // Required target quantity
  progress: number;
  completed: boolean;
  rewardXp: number;
}

export interface RaidState {
  isActive: boolean;
  map: MapData | null;
  tiles: RoomTile[];
  currentStage: number; // current tile index
  status: "deploying" | "scavenging" | "combat" | "extracting" | "extracted" | "kia";
  combatTarget: EnemyState | null;
  logs: RaidLog[];
  lootFound: { item: GameItem; quantity: number }[];
  secureContainerSaved: { item: GameItem; quantity: number }[];
  elapsedSeconds: number;
  playSpeed: number; // 1x, 2x, 5x, etc.
  
  // Custom tracking for GDD rules
  usedMedkitDuringRaid: boolean;
  reinforcementsSpawnedThisTile: number;
  killsByTier: {
    Scav: number;
    PMC: number;
    Boss: number;
    [bossName: string]: number;
  };
}

export interface GameState {
  pmc: PMCCharacter;
  stash: Stash;
  hideout: Hideout;
  activeRaid: RaidState;
  selectedMapId: string;
  activeQuests: Quest[];
  completedQuestIds: string[];
  pastRaidOutcomes: ("extracted" | "kia")[];
}
