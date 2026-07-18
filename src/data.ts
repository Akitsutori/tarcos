/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, Weapon, WeaponModCategory, ClassType, MapData, HideoutModule, Skill, CharacterSkills, PMCCharacter, Hideout, Quest, PMCBodyParts, BodyPart, RoomTile } from "./types";

// Helper to create barter item
const createBarter = (id: string, name: string, description: string, rarity: GameItem["rarity"], value: number, icon: string): GameItem => ({
  id, name, description, type: "barter", rarity, value, iconName: icon, dropWeight: 1
});

// Helper to create medical item with resource pool
const createMedical = (id: string, name: string, description: string, resource: number, value: number, icon: string, hpHeal = 25): GameItem => ({
  id, name, description, type: "medical", rarity: resource > 300 ? "epic" : resource >= 150 ? "rare" : "common", value, hpHeal, resourceCurrent: resource, resourceMax: resource, iconName: icon, dropWeight: 1
});

// Helper to create surgical kit
const createSurgicalKit = (id: string, name: string, description: string, uses: number, value: number, icon: string): GameItem => ({
  id, name, description, type: "medical", rarity: uses > 5 ? "epic" : uses > 3 ? "rare" : "common", value, resourceCurrent: uses, resourceMax: uses, iconName: icon, dropWeight: 1
});

// Helper to create provisions item
const createProvision = (id: string, name: string, description: string, resource: number, value: number, icon: string, provisionType: "hydration" | "energy"): GameItem => ({
  id, name, description, type: "provision", provisionType, rarity: resource >= 80 ? "rare" : "common", value, resourceCurrent: resource, resourceMax: resource, iconName: icon, dropWeight: 1
});

// Helper to create ammo box
const createAmmoBox = (id: string, name: string, caliber: string, value: number, icon: string): GameItem => ({
  id, name, description: `A box containing matching rounds for weapons chambered in ${caliber}. Fully refills your magazine and reserves during maintenance.`, type: "ammo", rarity: "common", value, caliber, iconName: icon, dropWeight: 1
});

// Helper to create armor
const createArmor = (id: string, name: string, armorClass: number, maxDurability: number, zones: string[], value: number, icon: string): GameItem => ({
  id, name, description: `Body Armor Class ${armorClass}. Protects: ${zones.join(", ")}. Max Durability: ${maxDurability}.`, type: "armor", rarity: armorClass >= 5 ? "epic" : armorClass >= 4 ? "rare" : "common", value, armorClass, durability: maxDurability, maxDurability, protectedZones: zones, iconName: icon, dropWeight: 1
});

// Helper to create helmet
const createHelmet = (id: string, name: string, armorClass: number, maxDurability: number, value: number, icon: string): GameItem => ({
  id, name, description: `Tactical Helmet Class ${armorClass}. Protects Head. Max Durability: ${maxDurability}.`, type: "helmet", rarity: armorClass >= 5 ? "epic" : armorClass >= 4 ? "rare" : "common", value, armorClass, durability: maxDurability, maxDurability, protectedZones: ["Head"], iconName: icon, dropWeight: 1
});

// Helper to create valuable item
const createValuable = (id: string, name: string, description: string, rarity: GameItem["rarity"], value: number, icon: string): GameItem => ({
  id, name, description, type: "valuable", rarity, value, iconName: icon, dropWeight: 1
});

// Helper to create quest item
const createQuestItem = (id: string, name: string, description: string, rarity: GameItem["rarity"], value = 0): GameItem => ({
  id, name, description, type: "quest", rarity, value, iconName: "FileText", dropWeight: 1
});

// Helper to create mod item
const createMod = (
  id: string,
  name: string,
  category: WeaponModCategory,
  ergo: number,
  recoil: number,
  dmg: number,
  crit: number,
  rarity: GameItem["rarity"],
  value: number,
  icon: string
): GameItem => ({
  id, name, description: `Weapon Mod - ${category}. Ergo: ${ergo > 0 ? "+" : ""}${ergo}, Recoil Reduction: ${recoil}%, Dmg: ${dmg > 0 ? "+" : ""}${dmg}, Crit: ${crit > 0 ? "+" : ""}${crit}%`,
  type: "weapon_mod",
  rarity,
  value,
  iconName: icon,
  dropWeight: 1,
  modCategory: category,
  ergoBonus: ergo,
  recoilReduction: recoil,
  dmgBonus: dmg,
  critBonus: crit
});

// All static items database matching GDD exactly
export const ALL_ITEMS: { [id: string]: GameItem } = {
  // BARTER ITEMS (for upgrades)
  cpu_fan: createBarter("cpu_fan", "CPU Fan", "Standard PC cooler. Smells of cheap thermal paste.", "common", 8500, "Cpu"),
  spark_plug: createBarter("spark_plug", "Spark Plug", "Standard automobile spark plug. Heavily requested by Mechanic.", "common", 12000, "Wrench"),
  bolts: createBarter("bolts", "Pack of Bolts", "Assorted metal bolts. Useful for basic constructions.", "common", 15000, "Nut"),
  nuts: createBarter("nuts", "Pack of Nuts", "Mating threads for bolts. Hard to find when you actually need them.", "common", 14500, "Nut"),
  hose: createBarter("hose", "Corrugated Hose", "Flexible rubber hose. A staple of Hideout upgrades.", "rare", 35000, "Cable"),
  circuit_board: createBarter("circuit_board", "Printed Circuit Board", "Salvaged electronic board from broken appliances.", "common", 18000, "Cpu"),
  cpu: createBarter("cpu", "Central Processing Unit", "An older generation processor. Worth some decent roubles.", "rare", 45000, "Cpu"),
  gpu: createBarter("gpu", "Graphics Processing Unit", "The legendary GPU. Used for physical mining or barter trades.", "legendary", 280000, "Cpu"),
  car_battery: createBarter("car_battery", "Car Battery", "Heavy lead-acid battery. Extremely heavy but valuable.", "rare", 65000, "Battery"),
  golden_rooster: createBarter("golden_rooster", "Golden Rooster", "An incredibly rare, shiny, and heavy golden figurine.", "legendary", 150000, "Award"),
  ledger: createBarter("ledger", "Secure Ledger", "Encrypted hardware wallet. Contains highly classified trading ledgers.", "epic", 95000, "FileText"),
  wd40: createBarter("wd40", "WD-40 (100ml)", "Multi-use water-displacing spray. Unsticks rusty joints.", "common", 19000, "Paintbrush"),
  fuel_tank: createBarter("fuel_tank", "Expeditionary Fuel Tank", "Plastic fuel container. Essential for keeping Hideout generator running.", "epic", 85000, "Container"),

  // AMMO BOXES (from GDD Loot Table)
  ammo_762x39_ps: createAmmoBox("ammo_762x39_ps", "7.62x39mm PS Box", "7.62x39mm", 15, "Disc"),
  ammo_9x18_pm: createAmmoBox("ammo_9x18_pm", "9x18mm PM Box", "9x18mm", 10, "Disc"),
  ammo_556x45_m855: createAmmoBox("ammo_556x45_m855", "5.56x45mm M855 Box", "5.56x45mm", 12, "Disc"),
  ammo_12x70_slug: createAmmoBox("ammo_12x70_slug", "12x70mm Slug Box", "12x70mm", 8, "Disc"),
  ammo_762x54_snb: createAmmoBox("ammo_762x54_snb", "7.62x54mm SNB Box", "7.62x54mm", 15, "Disc"),

  // MEDICAL ITEMS (from GDD Loot Table)
  ai2: { ...createMedical("ai2", "AI-2 Medkit", "The classic orange 'cheese' slice. Heals 25 HP per use. Capacity: 150", 150, 4500, "Activity"), soldBy: "therapist", traderCost: 5400 },
  ifak: { ...createMedical("ifak", "IFAK Personal Tactical First Aid Kit", "Compact medical pouch. Capacity: 300", 300, 18000, "HeartPulse"), soldBy: "therapist", traderCost: 21600 },
  afak: createMedical("afak", "AFAK First Aid Kit", "Advanced tactical trauma kit. High capacity. Capacity: 400", 400, 32000, "HeartPulse"),
  
  // SURGICAL KITS (from GDD Loot Table)
  surgical_kit: { ...createSurgicalKit("surgical_kit", "Surgical Kit", "Surgical instruments to patch blacked-out body parts to 1 HP. 5 Uses.", 5, 25000, "Scissors"), soldBy: "therapist", traderCost: 30000 },
  cms_kit: { ...createSurgicalKit("cms_kit", "CMS Kit", "Standard field surgery and limb restoration kit. 3 Uses.", 3, 20000, "Scissors"), soldBy: "therapist", traderCost: 24000 },
  surv12: { ...createSurgicalKit("surv12", "Surv12 Surgical Kit", "Premium survival surgical kit with multi-use suture threads. 9 Uses.", 9, 30000, "Scissors"), soldBy: "therapist", traderCost: 36000 },

  // PROVISIONS — HYDRATION (from GDD Loot Table)
  water_bottle: { ...createProvision("water_bottle", "Water Bottle", "0.6L Bottle of Purified Water. Hydration: 60", 60, 4000, "Droplet", "hydration"), soldBy: "therapist", traderCost: 4800 },
  juice: { ...createProvision("juice", "Juice Box", "Sweet pack of apple juice. Hydration: 30", 30, 3000, "GlassWater", "hydration"), soldBy: "therapist", traderCost: 3600 },
  energy_drink: { ...createProvision("energy_drink", "Energy Drink", "Sweet carbonated drink. Hydration: 40", 40, 2000, "Zap", "hydration"), soldBy: "therapist", traderCost: 2400 },
  aquamarin: createProvision("aquamarin", "Aquamarin", "Sparkling mineral water. Hydration: 100", 100, 6000, "Droplet", "hydration"),

  // PROVISIONS — ENERGY (from GDD Loot Table)
  crackers: { ...createProvision("crackers", "Crackers", "Dry crackers. Energy: 30", 30, 2000, "Cookie", "energy"), soldBy: "therapist", traderCost: 2400 },
  canned_food: { ...createProvision("canned_food", "Canned Food", "Canned beef stew. Energy: 50", 50, 3500, "Utensils", "energy"), soldBy: "therapist", traderCost: 4200 },
  mre: { ...createProvision("mre", "MRE", "Military meal ready to eat. Energy: 80", 80, 6000, "Beef", "energy"), soldBy: "therapist", traderCost: 7200 },

  // WEAPON MODS (from GDD Loot Table)
  collimator: { ...createMod("collimator", "Red Dot Sight", WeaponModCategory.SIGHT, 3, 1, 0, 0, "common", 8000, "Eye"), soldBy: "mechanic", traderCost: 9600 },
  eotech: { ...createMod("eotech", "Holographic Sight", WeaponModCategory.SIGHT, 5, 1, 0, 0, "rare", 12000, "Eye"), soldBy: "mechanic", traderCost: 14400 },
  scope_4x: createMod("scope_4x", "4x Scope", WeaponModCategory.SIGHT, 8, -2, 0, 0, "rare", 15000, "Target"),
  scope_thermal: createMod("scope_thermal", "Thermal Scope", WeaponModCategory.SIGHT, 12, -1, 0, 0, "epic", 25000, "Crosshair"),

  rotor43: { ...createMod("rotor43", "Suppressor", WeaponModCategory.SUPPRESSOR, 0, 2, 0, 0, "rare", 15000, "ShieldAlert"), soldBy: "mechanic", traderCost: 18000 },
  long_barrel: createMod("long_barrel", "Long Barrel", WeaponModCategory.SUPPRESSOR, 3, -1, 0, 0, "common", 10000, "Flame"),
  muzzle_brake: createMod("muzzle_brake", "Muzzle Brake", WeaponModCategory.SUPPRESSOR, 2, 1, 0, 0, "common", 6000, "Flame"),

  rvg_grip: { ...createMod("rvg_grip", "Vertical Grip", WeaponModCategory.GRIP, 0, 3, 0, 0, "common", 8000, "Hand"), soldBy: "mechanic", traderCost: 9600 },
  rk1_grip: { ...createMod("rk1_grip", "Angled Grip", WeaponModCategory.GRIP, 2, 1, 0, 0, "common", 7000, "Pocket"), soldBy: "mechanic", traderCost: 8400 },
  laser_grip: createMod("laser_grip", "Laser Grip", WeaponModCategory.GRIP, 4, -1, 0, 0, "rare", 12000, "Zap"),

  light_stock: createMod("light_stock", "Light Stock", WeaponModCategory.STOCK, 0, 1, 0, 0, "common", 6000, "Bookmark"),
  moe_stock: { ...createMod("moe_stock", "Precision Stock", WeaponModCategory.STOCK, 3, 2, 0, 0, "rare", 12000, "Crown"), soldBy: "mechanic", traderCost: 14400 },
  folded_stock: createMod("folded_stock", "Folded Stock", WeaponModCategory.STOCK, -5, -3, 0, 0, "common", 5000, "FolderHeart"),

  mag_pmag: { ...createMod("mag_pmag", "Extended Mag", WeaponModCategory.MAGAZINE, 0, 0, 0, 0, "rare", 10000, "Disc"), soldBy: "mechanic", traderCost: 12000 },
  mag_drum: { ...createMod("mag_drum", "Drum Mag", WeaponModCategory.MAGAZINE, 0, -2, 0, 0, "epic", 20000, "Disc"), soldBy: "mechanic", traderCost: 24000 },

  // VALUABLES (from GDD Loot Table)
  tetriz: createValuable("tetriz", "Tetriz", "Handheld console. Highly requested by Ragman.", "epic", 50, "Gamepad"),
  gp_coin: createValuable("gp_coin", "GP Coin", "Physical Bitcoin-adjacent golden coin.", "rare", 20, "Coins"),
  ledx: createValuable("ledx", "LEDX", "Ophthalmoscope device used to check high-tier medical nodes.", "legendary", 50, "Award"),

  // QUEST ITEMS (from GDD Loot Table)
  golden_pocket_watch: createQuestItem("golden_pocket_watch", "Golden Pocket Watch", "Prapor's requested pocket watch, found deep in Customs.", "epic"),
  bronze_pocket_watch: createQuestItem("bronze_pocket_watch", "Bronze Pocket Watch", "Bronze version of the pocket watch from Customs.", "rare"),
  suspicious_letter: createQuestItem("suspicious_letter", "Suspicious Letter", "Unlabeled and sealed intelligence dispatch.", "rare"),
  church_key: createQuestItem("church_key", "Church Key", "Rusted key to the local chapel.", "epic"),
  toilet_paper: createQuestItem("toilet_paper", "Toilet Paper", "Extremely precious resource requested by Prapor for trade.", "common"),

  // ARMORS (from GDD Loot Table)
  paca: createArmor("paca", "PACA", 2, 30, ["Thorax"], 15000, "Shield"),
  armor_6b23: createArmor("armor_6b23", "6B23-1", 3, 45, ["Thorax", "Stomach"], 25000, "Shield"),
  armor_6b13: createArmor("armor_6b13", "6B13 M", 4, 50, ["Thorax", "Stomach"], 35000, "Shield"),
  armor_6b13_heavy: createArmor("armor_6b13_heavy", "6B13 M (Heavy)", 4, 60, ["Thorax", "Stomach", "Arms"], 45000, "ShieldCheck"),
  armor_killa: createArmor("armor_killa", "6B13 M (Killa)", 5, 80, ["Thorax", "Stomach", "Arms"], 80000, "Crown"),
  armor_glukhar: createArmor("armor_glukhar", "6B13 M (Glukhar)", 5, 90, ["Thorax", "Stomach", "Arms"], 95000, "Crown"),

  // HELMETS (from GDD Loot Table)
  untar: createHelmet("untar", "UNTAR", 3, 25, 12000, "ShieldCheck"),
  ssh68: createHelmet("ssh68", "SSh-68", 3, 30, 14000, "ShieldCheck"),
  helmet_6b47: createHelmet("helmet_6b47", "6B47", 4, 40, 22000, "ShieldCheck"),
  ulach: createHelmet("ulach", "UlACH", 4, 35, 25000, "ShieldCheck"),
  fast_mt: createHelmet("fast_mt", "FAST MT", 4, 45, 32000, "ShieldCheck"),
  tor_team: createHelmet("tor_team", "TOR Team", 4, 50, 38000, "ShieldCheck"),
  altyn: createHelmet("altyn", "Altyn", 5, 60, 65000, "Shield")
};

// 6 Room Types for Procedural Generation (GDD Section 3)
export const ROOM_TEMPLATES = [
  { name: "Factory Floor", description: "An abandoned factory floor with conveyor belts and industrial machinery.", type: "factory_floor" },
  { name: "Offices", description: "A set of offices with overturned desks and filing cabinets.", type: "offices" },
  { name: "Garage", description: "A vehicle garage with oil stains and tool benches.", type: "garage" },
  { name: "Cafeteria", description: "A large cafeteria with overturned tables and scattered trays.", type: "cafeteria" },
  { name: "Server Room", description: "A cooled server room with blinking equipment racks.", type: "server_room" },
  { name: "Armory", description: "A weapons storage room with empty weapon racks.", type: "armory" }
];

// Map deployment specifications
export const ALL_MAPS: MapData[] = [
  {
    id: "factory",
    name: "Factory",
    description: "An abandoned chemical plant. Compact, chaotic, and dangerous. High scavenger activity.",
    difficulty: "Easy",
    stagesCount: 15, // GDD tile range: 15-22
    scavSpawnChance: 0.50,
    pmcSpawnChance: 0.15,
    bossSpawnChance: 0.10,
    bossName: "Tagilla",
    lootMultiplier: 1.0,
    levelRequired: 1,
    color: "amber"
  },
  {
    id: "customs",
    name: "Customs",
    description: "Industrial park near a major transit hub. Features offices, bridges, dorms, and open gas stations.",
    difficulty: "Medium",
    stagesCount: 17,
    scavSpawnChance: 0.55,
    pmcSpawnChance: 0.25,
    bossSpawnChance: 0.15,
    bossName: "Reshala",
    lootMultiplier: 1.5,
    levelRequired: 3,
    color: "emerald"
  },
  {
    id: "woods",
    name: "Woods",
    description: "Dense forest reservation. Sneaky long-range sniper engagements and camps hidden among mountains.",
    difficulty: "Medium",
    stagesCount: 18,
    scavSpawnChance: 0.45,
    pmcSpawnChance: 0.20,
    bossSpawnChance: 0.20,
    bossName: "Shturman",
    lootMultiplier: 1.8,
    levelRequired: 5,
    color: "green"
  },
  {
    id: "reserve",
    name: "Reserve",
    description: "A secret military base. Dense with high-tier weapon caches, bunkers, and armored raiders.",
    difficulty: "Hard",
    stagesCount: 20,
    scavSpawnChance: 0.60,
    pmcSpawnChance: 0.35,
    bossSpawnChance: 0.25,
    bossName: "Glukhar",
    lootMultiplier: 2.3,
    levelRequired: 8,
    color: "orange"
  },
  {
    id: "streets",
    name: "Streets of Tarkov",
    description: "The heart of the metropolis. Huge high-rise residential zones, hotels, dealerships, and extreme risk.",
    difficulty: "Insane",
    stagesCount: 22,
    scavSpawnChance: 0.65,
    pmcSpawnChance: 0.45,
    bossSpawnChance: 0.30,
    bossName: "Kaban",
    lootMultiplier: 3.2,
    levelRequired: 12,
    color: "rose"
  }
];

// Procedural Map Construction (GDD Section 3)
export const buildProceduralMap = (mapData: MapData): RoomTile[] => {
  // Tile size is a random value within the range defined (Factory 15, Customs 17, etc.)
  const roomCount = mapData.stagesCount;
  const tiles: RoomTile[] = [];

  for (let i = 0; i < roomCount; i++) {
    const randomTemplate = ROOM_TEMPLATES[Math.floor(Math.random() * ROOM_TEMPLATES.length)];
    tiles.push({ ...randomTemplate });
  }

  // Appending Extraction Zone (GDD: "An Extraction Zone is appended as the final tile.")
  tiles.push({
    name: "Extraction Zone",
    description: "Your path out of the zone is clear. Rush to extract before hostile forces locate you.",
    type: "extraction"
  });

  return tiles;
};

// Weapons Specifications exactly as GDD Section 7.1
export const INITIAL_WEAPONS: { [key in ClassType]: Weapon } = {
  [ClassType.SOLDIER]: {
    id: "assault_rifle",
    name: "Assault Rifle (7.62x39mm)",
    baseErgo: 50,
    baseRecoil: 85,
    baseDmg: 50, // Matches 7.62x39mm PP ammo damage
    baseAccuracy: 50, // Weapon Base from GDD
    mods: {},
    signatureClass: ClassType.SOLDIER,
    caliber: "7.62x39mm",
    currentMagRounds: 30,
    maxMagSize: 30,
    reserveMags: 3,
    maxReserveMags: 3
  },
  [ClassType.SCOUT]: {
    id: "smg",
    name: "SMG (9x19mm)",
    baseErgo: 65,
    baseRecoil: 45,
    baseDmg: 28, // PBP ammo base
    baseAccuracy: 45,
    mods: {},
    signatureClass: ClassType.SCOUT,
    caliber: "9x19mm",
    currentMagRounds: 30,
    maxMagSize: 30,
    reserveMags: 3, // Scout gets overwritten to 4 in code
    maxReserveMags: 3
  },
  [ClassType.SURVIVOR]: {
    id: "shotgun",
    name: "Shotgun (12x70mm)",
    baseErgo: 44,
    baseRecoil: 105,
    baseDmg: 65, // Slug base
    baseAccuracy: 40,
    mods: {},
    signatureClass: ClassType.SURVIVOR,
    caliber: "12x70mm",
    currentMagRounds: 6,
    maxMagSize: 6,
    reserveMags: 2,
    maxReserveMags: 2
  },
  [ClassType.MARKSMAN]: {
    id: "marksman_rifle",
    name: "Marksman Rifle (7.62x54mm)",
    baseErgo: 35,
    baseRecoil: 140,
    baseDmg: 75, // SNB base
    baseAccuracy: 70,
    mods: {},
    signatureClass: ClassType.MARKSMAN,
    caliber: "7.62x54mm",
    currentMagRounds: 10,
    maxMagSize: 10,
    reserveMags: 2,
    maxReserveMags: 2
  },
  [ClassType.LUCKY]: {
    id: "lmg",
    name: "LMG (7.62x39mm)",
    baseErgo: 30,
    baseRecoil: 120,
    baseDmg: 57, // PS base
    baseAccuracy: 45,
    mods: {},
    signatureClass: ClassType.LUCKY,
    caliber: "7.62x39mm",
    currentMagRounds: 45,
    maxMagSize: 45,
    reserveMags: 2,
    maxReserveMags: 2
  }
};

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

  if (classType === ClassType.LUCKY) {
    startingArmor = { ...ALL_ITEMS.armor_6b23 }; // Class 3
  }

  return {
    classType,
    level: 1,
    xp: 0,
    maxXp: 200, // Level 1 -> 2: 200 XP
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

// Trader Quest database (25 unique quests matching GDD Section 14)
export const ALL_QUESTS: Quest[] = [
  // PRAPOR (10 quests)
  { id: "prapor_01", name: "Debut", trader: "prapor", type: "Kill", target: "Scav", count: 5, progress: 0, completed: false, rewardXp: 80 },
  { id: "prapor_02", name: "Counter-Sniper", trader: "prapor", type: "Kill", target: "PMC", count: 3, progress: 0, completed: false, rewardXp: 150 },
  { id: "prapor_03", name: "Big Score", trader: "prapor", type: "Kill", target: "Killa", count: 1, progress: 0, completed: false, rewardXp: 300 },
  { id: "prapor_04", name: "Pocket Watch", trader: "prapor", type: "Find", target: "golden_pocket_watch", count: 1, progress: 0, completed: false, rewardXp: 150 },
  { id: "prapor_05", name: "Bronze Age", trader: "prapor", type: "Find", target: "bronze_pocket_watch", count: 1, progress: 0, completed: false, rewardXp: 120 },
  { id: "prapor_06", name: "Tissue Issues", trader: "prapor", type: "Find", target: "toilet_paper", count: 1, progress: 0, completed: false, rewardXp: 300 },
  { id: "prapor_07", name: "Big Game Hunter", trader: "prapor", type: "Kill", target: "Boss", count: 1, progress: 0, completed: false, rewardXp: 400 },
  { id: "prapor_08", name: "Pocket Change", trader: "prapor", type: "Collect", target: "5000", count: 5000, progress: 0, completed: false, rewardXp: 250 },
  { id: "prapor_09", name: "Full Auto", trader: "prapor", type: "Kill", target: "PMC", count: 5, progress: 0, completed: false, rewardXp: 200 },
  { id: "prapor_10", name: "Scav Massacre", trader: "prapor", type: "Kill", target: "Scav", count: 15, progress: 0, completed: false, rewardXp: 350 },

  // THERAPIST (7 quests)
  { id: "therapist_01", name: "Explorer", trader: "therapist", type: "Extract", target: "Any", count: 3, progress: 0, completed: false, rewardXp: 60 },
  { id: "therapist_02", name: "Scrap Metal", trader: "therapist", type: "Collect", target: "2000", count: 2000, progress: 0, completed: false, rewardXp: 50 },
  { id: "therapist_03", name: "Deep Pockets", trader: "therapist", type: "Extract", target: "Any", count: 5, progress: 0, completed: false, rewardXp: 100 },
  { id: "therapist_04", name: "Back Pain", trader: "therapist", type: "Extract", target: "Any", count: 6, progress: 0, completed: false, rewardXp: 120 },
  { id: "therapist_05", name: "The Doctor is Out", trader: "therapist", type: "Extract", target: "no_medkit", count: 1, progress: 0, completed: false, rewardXp: 200 },
  { id: "therapist_06", name: "Blood Bank", trader: "therapist", type: "Valuables", target: "Valuables", count: 8, progress: 0, completed: false, rewardXp: 150 },
  { id: "therapist_07", name: "Check-up", trader: "therapist", type: "Extract", target: "Any", count: 8, progress: 0, completed: false, rewardXp: 160 },

  // RAGMAN (8 quests)
  { id: "ragman_01", name: "Collector", trader: "ragman", type: "Valuables", target: "Valuables", count: 3, progress: 0, completed: false, rewardXp: 100 },
  { id: "ragman_02", name: "Lend-Lease", trader: "ragman", type: "Find", target: "ledx", count: 1, progress: 0, completed: false, rewardXp: 200 },
  { id: "ragman_03", name: "Hardware", trader: "ragman", type: "Valuables", target: "Valuables", count: 6, progress: 0, completed: false, rewardXp: 150 },
  { id: "ragman_04", name: "Tetriz Hunter", trader: "ragman", type: "Find", target: "tetriz", count: 1, progress: 0, completed: false, rewardXp: 180 },
  { id: "ragman_05", name: "Rags to Riches", trader: "ragman", type: "Valuables", target: "Valuables", count: 12, progress: 0, completed: false, rewardXp: 200 },
  { id: "ragman_06", name: "Fashionably Late", trader: "ragman", type: "Collect", target: "4000", count: 4000, progress: 0, completed: false, rewardXp: 180 },
  { id: "ragman_07", name: "Threadbare", trader: "ragman", type: "Valuables", target: "Valuables", count: 5, progress: 0, completed: false, rewardXp: 120 },
  { id: "ragman_08", name: "Hand-Me-Down", trader: "ragman", type: "Extract", target: "Any", count: 5, progress: 0, completed: false, rewardXp: 110 }
];

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
      "Passive HP regeneration +2 HP/min out of raid",
      "Craft advanced medical supplies & +5 HP/min out of raid",
      "PMC heals automatically for free after raid and +10 HP/min passive regeneration",
      {
        1: { cost: 15000, reqItems: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }] },
        2: { cost: 50000, reqItems: [{ itemId: "bolts", quantity: 4 }, { itemId: "nuts", quantity: 4 }, { itemId: "hose", quantity: 2 }] },
        3: { cost: 120000, reqItems: [{ itemId: "hose", quantity: 4 }, { itemId: "circuit_board", quantity: 2 }, { itemId: "car_battery", quantity: 1 }] }
      }
    ),
    workbench: makeModule(
      "workbench", "Workbench", "Enables advanced weapon modification stat tuning and ammo assembly.", "Hammer",
      "+5% Weapon Ergonomics and -3% Recoil across all weapons",
      "Enables crafting of high-tier weapon attachments",
      "+12% Weapon Ergonomics and -10% Weapon Recoil on all weapons",
      {
        1: { cost: 20000, reqItems: [{ itemId: "bolts", quantity: 3 }, { itemId: "spark_plug", quantity: 2 }] },
        2: { cost: 65000, reqItems: [{ itemId: "cpu_fan", quantity: 4 }, { itemId: "circuit_board", quantity: 3 }, { itemId: "wd40", quantity: 1 }] },
        3: { cost: 180000, reqItems: [{ itemId: "circuit_board", quantity: 5 }, { itemId: "gpu", quantity: 1 }, { itemId: "wd40", quantity: 2 }] }
      }
    ),
    intelligenceCenter: makeModule(
      "intelligenceCenter", "Intelligence Center", "Reduces scav raid timers, increases raid rouble yield and search speed.", "FileText",
      "+5% Experience gain from all sources",
      "+15% Secure Container capacity & +10% Experience gain",
      "+15% Trader payout & Secure Container size increased to Gamma (9 slots)",
      {
        1: { cost: 30000, reqItems: [{ itemId: "circuit_board", quantity: 2 }, { itemId: "cpu_fan", quantity: 2 }] },
        2: { cost: 90000, reqItems: [{ itemId: "cpu", quantity: 3 }, { itemId: "ledger", quantity: 1 }] },
        3: { cost: 250000, reqItems: [{ itemId: "gpu", quantity: 1 }, { itemId: "ledger", quantity: 2 }, { itemId: "car_battery", quantity: 1 }] }
      }
    ),
    shootingRange: makeModule(
      "shootingRange", "Shooting Range", "Testing ground. Increases PMC weapon accuracy, combat XP, and critical chance.", "Target",
      "+5% Base weapon damage in raid",
      "+5% Critical hit chance",
      "+15% Weapon Accuracy and +10% Critical hit damage",
      {
        1: { cost: 180000, reqItems: [{ itemId: "bolts", quantity: 5 }, { itemId: "nuts", quantity: 5 }] },
        2: { cost: 75000, reqItems: [{ itemId: "bolts", quantity: 10 }, { itemId: "nuts", quantity: 10 }, { itemId: "wd40", quantity: 1 }] },
        3: { cost: 150000, reqItems: [{ itemId: "hose", quantity: 3 }, { itemId: "car_battery", quantity: 1 }] }
      }
    ),
    nutritionUnit: makeModule(
      "nutritionUnit", "Nutrition Unit", "Ensures PMC food and hydration decays slower and recovers faster.", "Apple",
      "Passive energy and hydration recovery +1 per min out of raid",
      "+25% maximum Energy and Hydration limit in raids",
      "Hunger and Hydration decay 20% slower in raids",
      {
        1: { cost: 12000, reqItems: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }] },
        2: { cost: 45000, reqItems: [{ itemId: "hose", quantity: 2 }, { itemId: "cpu_fan", quantity: 3 }] },
        3: { cost: 110000, reqItems: [{ itemId: "fuel_tank", quantity: 1 }, { itemId: "hose", quantity: 4 }] }
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
  if (workbenchLevel >= 3) {
    ergo += 7; // aggregate is +12%
    recoil = Math.max(10, recoil - Math.floor(recoil * 0.07)); // aggregate is -10%
  }

  return {
    ergo: Math.min(100, Math.max(10, ergo)),
    recoil: Math.max(15, recoil),
    dmg,
    accuracy: Math.min(100, accuracy + Math.floor(ergo / 5)), // ergonomics gives weapon accuracy bonuses
    critBonus
  };
};
