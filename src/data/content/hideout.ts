/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hideout module definitions. Plain static data (all properties explicit) —
 * the runtime Hideout is constructed from these by createInitialHideout
 * (src/data.ts), which stamps the per-save state fields (level, maxLevel).
 */

export interface HideoutModuleDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string;
  upgrades: {
    [level: number]: {
      cost: number;
      requirements: { itemId: string; quantity: number }[];
      bonus: string;
    };
  };
}

export const HIDE_OUT_MODULE_MAX_LEVEL = 3;

export const HIDE_OUT_MODULE_DEFINITIONS: Record<string, HideoutModuleDefinition> = {
  medstation: {
    id: "medstation",
    name: "Medstation",
    description: "Craft medkits and passive health recovery station.",
    iconName: "HeartPulse",
    upgrades: {
      1: { cost: 15000, requirements: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }], bonus: "Passive HP regeneration: +2 HP per tick out of raid" },
      2: { cost: 50000, requirements: [{ itemId: "bolts", quantity: 4 }, { itemId: "nuts", quantity: 4 }, { itemId: "hose", quantity: 2 }], bonus: "Craft advanced medical supplies & +5 HP per tick out of raid" },
      3: { cost: 120000, requirements: [{ itemId: "hose", quantity: 4 }, { itemId: "circuit_board", quantity: 2 }, { itemId: "car_battery", quantity: 1 }], bonus: "Powerful passive HP regeneration: +12 HP per tick out of raid" },
    },
  },
  workbench: {
    id: "workbench",
    name: "Workbench",
    description: "Enables advanced weapon modification stat tuning and ammo assembly.",
    iconName: "Hammer",
    upgrades: {
      1: { cost: 20000, requirements: [{ itemId: "bolts", quantity: 3 }, { itemId: "spark_plug", quantity: 2 }], bonus: "+5 Weapon Ergonomics and -3% Recoil across all weapons" },
      2: { cost: 65000, requirements: [{ itemId: "cpu_fan", quantity: 4 }, { itemId: "circuit_board", quantity: 3 }, { itemId: "wd40", quantity: 1 }], bonus: "+8 Weapon Ergonomics and -6% Recoil across all weapons" },
      3: { cost: 180000, requirements: [{ itemId: "circuit_board", quantity: 5 }, { itemId: "gpu", quantity: 1 }, { itemId: "wd40", quantity: 2 }], bonus: "+12 Weapon Ergonomics and -10% Recoil on all weapons" },
    },
  },
  intelligenceCenter: {
    id: "intelligenceCenter",
    name: "Intelligence Center",
    description: "Reduces scav raid timers, increases raid rouble yield and search speed.",
    iconName: "FileText",
    upgrades: {
      1: { cost: 30000, requirements: [{ itemId: "circuit_board", quantity: 2 }, { itemId: "cpu_fan", quantity: 2 }], bonus: "+5% Experience gain from all sources" },
      2: { cost: 90000, requirements: [{ itemId: "cpu", quantity: 3 }, { itemId: "ledger", quantity: 1 }], bonus: "+10% Experience gain & Secure Container capacity increased (6 slots)" },
      3: { cost: 250000, requirements: [{ itemId: "gpu", quantity: 1 }, { itemId: "ledger", quantity: 2 }, { itemId: "car_battery", quantity: 1 }], bonus: "+15% Experience gain & Secure Container size increased to Gamma (9 slots)" },
    },
  },
  shootingRange: {
    id: "shootingRange",
    name: "Shooting Range",
    description: "Training ground. Increases PMC weapon skill through live practice.",
    iconName: "Target",
    upgrades: {
      1: { cost: 180000, requirements: [{ itemId: "bolts", quantity: 5 }, { itemId: "nuts", quantity: 5 }], bonus: "+1 Weapon Skill point" },
      2: { cost: 75000, requirements: [{ itemId: "bolts", quantity: 10 }, { itemId: "nuts", quantity: 10 }, { itemId: "wd40", quantity: 1 }], bonus: "+2 additional Weapon Skill points (total +3)" },
      3: { cost: 150000, requirements: [{ itemId: "hose", quantity: 3 }, { itemId: "car_battery", quantity: 1 }], bonus: "+3 additional Weapon Skill points (total +6)" },
    },
  },
  nutritionUnit: {
    id: "nutritionUnit",
    name: "Nutrition Unit",
    description: "Ensures PMC food and hydration decays slower and recovers faster.",
    iconName: "Apple",
    upgrades: {
      1: { cost: 12000, requirements: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }], bonus: "Passive energy and hydration recovery: +2 per tick out of raid" },
      2: { cost: 45000, requirements: [{ itemId: "hose", quantity: 2 }, { itemId: "cpu_fan", quantity: 3 }], bonus: "Passive energy and hydration recovery: +4 per tick out of raid" },
      3: { cost: 110000, requirements: [{ itemId: "fuel_tank", quantity: 1 }, { itemId: "hose", quantity: 4 }], bonus: "Hunger and Hydration decay 20% slower in raids" },
    },
  },
  scavengerWorkstation: {
    id: "scavengerWorkstation",
    name: "Scavenger Workstation",
    description: "Salvages barter goods after every successful extraction.",
    iconName: "Wrench",
    upgrades: {
      1: { cost: 25000, requirements: [{ itemId: "bolts", quantity: 2 }, { itemId: "nuts", quantity: 2 }], bonus: "Salvages loose parts after extraction (+2 bolts)" },
      2: { cost: 60000, requirements: [{ itemId: "circuit_board", quantity: 2 }, { itemId: "spark_plug", quantity: 2 }], bonus: "Improved salvaging: higher-value components recovered after extraction" },
      3: { cost: 150000, requirements: [{ itemId: "wd40", quantity: 2 }, { itemId: "cpu", quantity: 1 }], bonus: "Advanced salvaging: rare electronics recovered after extraction" },
    },
  },
};
