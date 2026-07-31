import { GameItem, WeaponModCategory } from "../../types";

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
