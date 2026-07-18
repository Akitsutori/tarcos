/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, Weapon, WeaponModCategory, ClassType, MapData, HideoutModule, Skill, CharacterSkills, PMCCharacter, Hideout, Quest, PMCBodyParts, BodyPart, RoomTile } from "./types";

// All static items database — plain objects, all properties explicit, rarity set directly
export const ALL_ITEMS: { [id: string]: GameItem } = {
  // BARTER ITEMS (for hideout upgrades)
  cpu_fan: { id: "cpu_fan", name: "CPU Fan", description: "Standard PC cooler. Smells of cheap thermal paste.", type: "barter", rarity: "common", value: 8500, iconName: "Cpu" },
  spark_plug: { id: "spark_plug", name: "Spark Plug", description: "Standard automobile spark plug. Heavily requested by Mechanic.", type: "barter", rarity: "common", value: 12000, iconName: "Wrench" },
  bolts: { id: "bolts", name: "Pack of Bolts", description: "Assorted metal bolts. Useful for basic constructions.", type: "barter", rarity: "common", value: 15000, iconName: "Nut" },
  nuts: { id: "nuts", name: "Pack of Nuts", description: "Mating threads for bolts. Hard to find when you actually need them.", type: "barter", rarity: "common", value: 14500, iconName: "Nut" },
  hose: { id: "hose", name: "Corrugated Hose", description: "Flexible rubber hose. A staple of Hideout upgrades.", type: "barter", rarity: "rare", value: 35000, iconName: "Cable" },
  circuit_board: { id: "circuit_board", name: "Printed Circuit Board", description: "Salvaged electronic board from broken appliances.", type: "barter", rarity: "common", value: 18000, iconName: "Cpu" },
  cpu: { id: "cpu", name: "Central Processing Unit", description: "An older generation processor. Worth some decent roubles.", type: "barter", rarity: "rare", value: 45000, iconName: "Cpu" },
  gpu: { id: "gpu", name: "Graphics Processing Unit", description: "The legendary GPU. Used for physical mining or barter trades.", type: "barter", rarity: "legendary", value: 280000, iconName: "Cpu" },
  car_battery: { id: "car_battery", name: "Car Battery", description: "Heavy lead-acid battery. Extremely heavy but valuable.", type: "barter", rarity: "rare", value: 65000, iconName: "Battery" },
  golden_rooster: { id: "golden_rooster", name: "Golden Rooster", description: "An incredibly rare, shiny, and heavy golden figurine.", type: "barter", rarity: "legendary", value: 150000, iconName: "Award" },
  ledger: { id: "ledger", name: "Secure Ledger", description: "Encrypted hardware wallet. Contains highly classified trading ledgers.", type: "barter", rarity: "epic", value: 95000, iconName: "FileText" },
  wd40: { id: "wd40", name: "WD-40 (100ml)", description: "Multi-use water-displacing spray. Unsticks rusty joints.", type: "barter", rarity: "common", value: 19000, iconName: "Paintbrush" },
  fuel_tank: { id: "fuel_tank", name: "Expeditionary Fuel Tank", description: "Plastic fuel container. Essential for keeping Hideout generator running.", type: "barter", rarity: "epic", value: 85000, iconName: "Container" },

  // AMMO BOXES
  ammo_762x39_ps: { id: "ammo_762x39_ps", name: "7.62x39mm PS Box", description: "A box containing matching rounds for weapons chambered in 7.62x39mm.", type: "ammo", rarity: "common", value: 15, iconName: "Disc", caliber: "7.62x39mm" },
  ammo_9x18_pm: { id: "ammo_9x18_pm", name: "9x18mm PM Box", description: "A box containing matching rounds for weapons chambered in 9x18mm.", type: "ammo", rarity: "common", value: 10, iconName: "Disc", caliber: "9x18mm" },
  ammo_556x45_m855: { id: "ammo_556x45_m855", name: "5.56x45mm M855 Box", description: "A box containing matching rounds for weapons chambered in 5.56x45mm.", type: "ammo", rarity: "common", value: 12, iconName: "Disc", caliber: "5.56x45mm" },
  ammo_12x70_slug: { id: "ammo_12x70_slug", name: "12x70mm Slug Box", description: "A box containing matching rounds for weapons chambered in 12x70mm.", type: "ammo", rarity: "common", value: 8, iconName: "Disc", caliber: "12x70mm" },
  ammo_762x54_snb: { id: "ammo_762x54_snb", name: "7.62x54mm SNB Box", description: "A box containing matching rounds for weapons chambered in 7.62x54mm.", type: "ammo", rarity: "common", value: 15, iconName: "Disc", caliber: "7.62x54mm" },

  // MEDICAL ITEMS — MEDKITS
  ai2: { id: "ai2", name: "AI-2 Medkit", description: "The classic orange cheese slice. Capacity: 150", type: "medical", medicalSubType: "medkit", rarity: "common", value: 4500, hpHeal: 25, resourceCurrent: 150, resourceMax: 150, iconName: "Activity", soldBy: "therapist", traderCost: 5400 },
  ifak: { id: "ifak", name: "IFAK Personal Tactical First Aid Kit", description: "Compact medical pouch. Capacity: 300", type: "medical", medicalSubType: "medkit", rarity: "epic", value: 18000, hpHeal: 25, resourceCurrent: 300, resourceMax: 300, iconName: "HeartPulse", soldBy: "therapist", traderCost: 21600 },
  afak: { id: "afak", name: "AFAK First Aid Kit", description: "Advanced tactical trauma kit. High capacity. Capacity: 400", type: "medical", medicalSubType: "medkit", rarity: "epic", value: 32000, hpHeal: 25, resourceCurrent: 400, resourceMax: 400, iconName: "HeartPulse" },

  // MEDICAL ITEMS — SURGICAL KITS
  surgical_kit: { id: "surgical_kit", name: "Surgical Kit", description: "Surgical instruments to patch blacked-out body parts to 1 HP. 5 Uses.", type: "medical", medicalSubType: "surgical", rarity: "rare", value: 25000, resourceCurrent: 5, resourceMax: 5, iconName: "Scissors", soldBy: "therapist", traderCost: 30000 },
  cms_kit: { id: "cms_kit", name: "CMS Kit", description: "Standard field surgery and limb restoration kit. 3 Uses.", type: "medical", medicalSubType: "surgical", rarity: "common", value: 20000, resourceCurrent: 3, resourceMax: 3, iconName: "Scissors", soldBy: "therapist", traderCost: 24000 },
  surv12: { id: "surv12", name: "Surv12 Surgical Kit", description: "Premium survival surgical kit with multi-use suture threads. 9 Uses.", type: "medical", medicalSubType: "surgical", rarity: "epic", value: 30000, resourceCurrent: 9, resourceMax: 9, iconName: "Scissors", soldBy: "therapist", traderCost: 36000 },

  // PROVISIONS — HYDRATION
  water_bottle: { id: "water_bottle", name: "Water Bottle", description: "0.6L Bottle of Purified Water. Hydration: 60", type: "provision", provisionType: "hydration", rarity: "common", value: 4000, resourceCurrent: 60, resourceMax: 60, iconName: "Droplet", soldBy: "therapist", traderCost: 4800 },
  juice: { id: "juice", name: "Juice Box", description: "Sweet pack of apple juice. Hydration: 30", type: "provision", provisionType: "hydration", rarity: "common", value: 3000, resourceCurrent: 30, resourceMax: 30, iconName: "GlassWater", soldBy: "therapist", traderCost: 3600 },
  energy_drink: { id: "energy_drink", name: "Energy Drink", description: "Sweet carbonated drink. Hydration: 40", type: "provision", provisionType: "hydration", rarity: "common", value: 2000, resourceCurrent: 40, resourceMax: 40, iconName: "Zap", soldBy: "therapist", traderCost: 2400 },
  aquamarin: { id: "aquamarin", name: "Aquamarin", description: "Sparkling mineral water. Hydration: 100", type: "provision", provisionType: "hydration", rarity: "rare", value: 6000, resourceCurrent: 100, resourceMax: 100, iconName: "Droplet" },

  // PROVISIONS — ENERGY
  crackers: { id: "crackers", name: "Crackers", description: "Dry crackers. Energy: 30", type: "provision", provisionType: "energy", rarity: "common", value: 2000, resourceCurrent: 30, resourceMax: 30, iconName: "Cookie", soldBy: "therapist", traderCost: 2400 },
  canned_food: { id: "canned_food", name: "Canned Food", description: "Canned beef stew. Energy: 50", type: "provision", provisionType: "energy", rarity: "common", value: 3500, resourceCurrent: 50, resourceMax: 50, iconName: "Utensils", soldBy: "therapist", traderCost: 4200 },
  mre: { id: "mre", name: "MRE", description: "Military meal ready to eat. Energy: 80", type: "provision", provisionType: "energy", rarity: "rare", value: 6000, resourceCurrent: 80, resourceMax: 80, iconName: "Beef", soldBy: "therapist", traderCost: 7200 },

  // WEAPON MODS — SIGHTS
  collimator: { id: "collimator", name: "Red Dot Sight", description: "Weapon Mod - Sight. Ergo: +3, Recoil: 1%", type: "weapon_mod", rarity: "common", value: 8000, iconName: "Eye", modCategory: WeaponModCategory.SIGHT, ergoBonus: 3, recoilReduction: 1, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 9600 },
  eotech: { id: "eotech", name: "Holographic Sight", description: "Weapon Mod - Sight. Ergo: +5, Recoil: 1%", type: "weapon_mod", rarity: "rare", value: 12000, iconName: "Eye", modCategory: WeaponModCategory.SIGHT, ergoBonus: 5, recoilReduction: 1, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 14400 },
  scope_4x: { id: "scope_4x", name: "4x Scope", description: "Weapon Mod - Sight. Ergo: +8, Recoil: -2%", type: "weapon_mod", rarity: "rare", value: 15000, iconName: "Target", modCategory: WeaponModCategory.SIGHT, ergoBonus: 8, recoilReduction: -2, dmgBonus: 0, critBonus: 0 },
  scope_thermal: { id: "scope_thermal", name: "Thermal Scope", description: "Weapon Mod - Sight. Ergo: +12, Recoil: -1%", type: "weapon_mod", rarity: "epic", value: 25000, iconName: "Crosshair", modCategory: WeaponModCategory.SIGHT, ergoBonus: 12, recoilReduction: -1, dmgBonus: 0, critBonus: 0 },

  // WEAPON MODS — MUZZLE
  rotor43: { id: "rotor43", name: "Suppressor", description: "Weapon Mod - Muzzle/Suppressor. Recoil: 2%", type: "weapon_mod", rarity: "rare", value: 15000, iconName: "ShieldAlert", modCategory: WeaponModCategory.SUPPRESSOR, ergoBonus: 0, recoilReduction: 2, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 18000 },
  long_barrel: { id: "long_barrel", name: "Long Barrel", description: "Weapon Mod - Muzzle/Suppressor. Ergo: +3, Recoil: -1%", type: "weapon_mod", rarity: "common", value: 10000, iconName: "Flame", modCategory: WeaponModCategory.SUPPRESSOR, ergoBonus: 3, recoilReduction: -1, dmgBonus: 0, critBonus: 0 },
  muzzle_brake: { id: "muzzle_brake", name: "Muzzle Brake", description: "Weapon Mod - Muzzle/Suppressor. Ergo: +2, Recoil: 1%", type: "weapon_mod", rarity: "common", value: 6000, iconName: "Flame", modCategory: WeaponModCategory.SUPPRESSOR, ergoBonus: 2, recoilReduction: 1, dmgBonus: 0, critBonus: 0 },

  // WEAPON MODS — GRIPS
  rvg_grip: { id: "rvg_grip", name: "Vertical Grip", description: "Weapon Mod - Foregrip. Recoil: 3%", type: "weapon_mod", rarity: "common", value: 8000, iconName: "Hand", modCategory: WeaponModCategory.GRIP, ergoBonus: 0, recoilReduction: 3, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 9600 },
  rk1_grip: { id: "rk1_grip", name: "Angled Grip", description: "Weapon Mod - Foregrip. Ergo: +2, Recoil: 1%", type: "weapon_mod", rarity: "common", value: 7000, iconName: "Pocket", modCategory: WeaponModCategory.GRIP, ergoBonus: 2, recoilReduction: 1, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 8400 },
  laser_grip: { id: "laser_grip", name: "Laser Grip", description: "Weapon Mod - Foregrip. Ergo: +4, Recoil: -1%", type: "weapon_mod", rarity: "rare", value: 12000, iconName: "Zap", modCategory: WeaponModCategory.GRIP, ergoBonus: 4, recoilReduction: -1, dmgBonus: 0, critBonus: 0 },

  // WEAPON MODS — STOCKS
  light_stock: { id: "light_stock", name: "Light Stock", description: "Weapon Mod - Stock. Recoil: 1%", type: "weapon_mod", rarity: "common", value: 6000, iconName: "Bookmark", modCategory: WeaponModCategory.STOCK, ergoBonus: 0, recoilReduction: 1, dmgBonus: 0, critBonus: 0 },
  moe_stock: { id: "moe_stock", name: "Precision Stock", description: "Weapon Mod - Stock. Ergo: +3, Recoil: 2%", type: "weapon_mod", rarity: "rare", value: 12000, iconName: "Crown", modCategory: WeaponModCategory.STOCK, ergoBonus: 3, recoilReduction: 2, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 14400 },
  folded_stock: { id: "folded_stock", name: "Folded Stock", description: "Weapon Mod - Stock. Ergo: -5, Recoil: -3%", type: "weapon_mod", rarity: "common", value: 5000, iconName: "FolderHeart", modCategory: WeaponModCategory.STOCK, ergoBonus: -5, recoilReduction: -3, dmgBonus: 0, critBonus: 0 },

  // WEAPON MODS — MAGAZINES
  mag_pmag: { id: "mag_pmag", name: "Extended Mag", description: "Weapon Mod - Magazine.", type: "weapon_mod", rarity: "rare", value: 10000, iconName: "Disc", modCategory: WeaponModCategory.MAGAZINE, ergoBonus: 0, recoilReduction: 0, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 12000 },
  mag_drum: { id: "mag_drum", name: "Drum Mag", description: "Weapon Mod - Magazine. Recoil: -2%", type: "weapon_mod", rarity: "epic", value: 20000, iconName: "Disc", modCategory: WeaponModCategory.MAGAZINE, ergoBonus: 0, recoilReduction: -2, dmgBonus: 0, critBonus: 0, soldBy: "mechanic", traderCost: 24000 },

  // VALUABLES
  tetriz: { id: "tetriz", name: "Tetriz", description: "Handheld console. Highly requested by Ragman.", type: "valuable", rarity: "epic", value: 50, iconName: "Gamepad" },
  gp_coin: { id: "gp_coin", name: "GP Coin", description: "Physical Bitcoin-adjacent golden coin.", type: "valuable", rarity: "rare", value: 20, iconName: "Coins" },
  ledx: { id: "ledx", name: "LEDX", description: "Ophthalmoscope device used to check high-tier medical nodes.", type: "valuable", rarity: "legendary", value: 50, iconName: "Award" },

  // QUEST ITEMS
  golden_pocket_watch: { id: "golden_pocket_watch", name: "Golden Pocket Watch", description: "Prapor's requested pocket watch, found deep in Customs.", type: "quest", rarity: "epic", value: 0, iconName: "FileText" },
  bronze_pocket_watch: { id: "bronze_pocket_watch", name: "Bronze Pocket Watch", description: "Bronze version of the pocket watch from Customs.", type: "quest", rarity: "rare", value: 0, iconName: "FileText" },
  suspicious_letter: { id: "suspicious_letter", name: "Suspicious Letter", description: "Unlabeled and sealed intelligence dispatch.", type: "quest", rarity: "rare", value: 0, iconName: "FileText" },
  church_key: { id: "church_key", name: "Church Key", description: "Rusted key to the local chapel.", type: "quest", rarity: "epic", value: 0, iconName: "FileText" },
  toilet_paper: { id: "toilet_paper", name: "Toilet Paper", description: "Extremely precious resource requested by Prapor for trade.", type: "quest", rarity: "common", value: 0, iconName: "FileText" },

  // ARMOR
  paca: { id: "paca", name: "PACA", description: "Body Armor Class 2. Protects: Thorax. Max Durability: 30.", type: "armor", rarity: "common", value: 15000, armorClass: 2, durability: 30, maxDurability: 30, protectedZones: ["Thorax"], iconName: "Shield" },
  armor_6b23: { id: "armor_6b23", name: "6B23-1", description: "Body Armor Class 3. Protects: Thorax, Stomach. Max Durability: 45.", type: "armor", rarity: "common", value: 25000, armorClass: 3, durability: 45, maxDurability: 45, protectedZones: ["Thorax", "Stomach"], iconName: "Shield" },
  armor_6b13: { id: "armor_6b13", name: "6B13 M", description: "Body Armor Class 4. Protects: Thorax, Stomach. Max Durability: 50.", type: "armor", rarity: "rare", value: 35000, armorClass: 4, durability: 50, maxDurability: 50, protectedZones: ["Thorax", "Stomach"], iconName: "Shield" },
  armor_6b13_heavy: { id: "armor_6b13_heavy", name: "6B13 M (Heavy)", description: "Body Armor Class 4. Protects: Thorax, Stomach, Arms. Max Durability: 60.", type: "armor", rarity: "rare", value: 45000, armorClass: 4, durability: 60, maxDurability: 60, protectedZones: ["Thorax", "Stomach", "Arms"], iconName: "ShieldCheck" },
  armor_killa: { id: "armor_killa", name: "6B13 M (Killa)", description: "Body Armor Class 5. Protects: Thorax, Stomach, Arms. Max Durability: 80.", type: "armor", rarity: "epic", value: 80000, armorClass: 5, durability: 80, maxDurability: 80, protectedZones: ["Thorax", "Stomach", "Arms"], iconName: "Crown" },
  armor_glukhar: { id: "armor_glukhar", name: "6B13 M (Glukhar)", description: "Body Armor Class 5. Protects: Thorax, Stomach, Arms. Max Durability: 90.", type: "armor", rarity: "epic", value: 95000, armorClass: 5, durability: 90, maxDurability: 90, protectedZones: ["Thorax", "Stomach", "Arms"], iconName: "Crown" },

  // HELMETS
  untar: { id: "untar", name: "UNTAR", description: "Tactical Helmet Class 3. Protects Head. Max Durability: 25.", type: "helmet", rarity: "common", value: 12000, armorClass: 3, durability: 25, maxDurability: 25, protectedZones: ["Head"], iconName: "ShieldCheck" },
  ssh68: { id: "ssh68", name: "SSh-68", description: "Tactical Helmet Class 3. Protects Head. Max Durability: 30.", type: "helmet", rarity: "common", value: 14000, armorClass: 3, durability: 30, maxDurability: 30, protectedZones: ["Head"], iconName: "ShieldCheck" },
  helmet_6b47: { id: "helmet_6b47", name: "6B47", description: "Tactical Helmet Class 4. Protects Head. Max Durability: 40.", type: "helmet", rarity: "rare", value: 22000, armorClass: 4, durability: 40, maxDurability: 40, protectedZones: ["Head"], iconName: "ShieldCheck" },
  ulach: { id: "ulach", name: "UlACH", description: "Tactical Helmet Class 4. Protects Head. Max Durability: 35.", type: "helmet", rarity: "rare", value: 25000, armorClass: 4, durability: 35, maxDurability: 35, protectedZones: ["Head"], iconName: "ShieldCheck" },
  fast_mt: { id: "fast_mt", name: "FAST MT", description: "Tactical Helmet Class 4. Protects Head. Max Durability: 45.", type: "helmet", rarity: "rare", value: 32000, armorClass: 4, durability: 45, maxDurability: 45, protectedZones: ["Head"], iconName: "ShieldCheck" },
  tor_team: { id: "tor_team", name: "TOR Team", description: "Tactical Helmet Class 4. Protects Head. Max Durability: 50.", type: "helmet", rarity: "rare", value: 38000, armorClass: 4, durability: 50, maxDurability: 50, protectedZones: ["Head"], iconName: "ShieldCheck" },
  altyn: { id: "altyn", name: "Altyn", description: "Tactical Helmet Class 5. Protects Head. Max Durability: 60.", type: "helmet", rarity: "epic", value: 65000, armorClass: 5, durability: 60, maxDurability: 60, protectedZones: ["Head"], iconName: "Shield" }
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
