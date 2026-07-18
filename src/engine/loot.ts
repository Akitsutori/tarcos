import { MapData, GameItem, PMCCharacter, RaidState } from "../types";
import { ALL_ITEMS } from "../data";
import { createLog } from "./utils";

/**
 * Rolls a random item from the loot table based on weights.
 *
 * @param map Map context (for map-specific loot rules if added later)
 * @param luckBonus Additional luck factor
 * @returns A cloned GameItem from the database
 */
export const rollLootItem = (map: MapData, luckBonus: number = 0): GameItem => {
  const lootTable = [
    { id: "ammo_762x39_ps", weight: 10 },
    { id: "ammo_9x18_pm", weight: 10 },
    { id: "ammo_556x45_m855", weight: 10 },
    { id: "ammo_12x70_slug", weight: 10 },
    { id: "ammo_762x54_snb", weight: 10 },
    { id: "ai2", weight: 9 },
    { id: "ifak", weight: 8 },
    { id: "afak", weight: 7 },
    { id: "surgical_kit", weight: 6 },
    { id: "cms_kit", weight: 4 },
    { id: "surv12", weight: 3 },
    { id: "collimator", weight: 3 },
    { id: "eotech", weight: 2 },
    { id: "rotor43", weight: 2 },
    { id: "long_barrel", weight: 3 },
    { id: "muzzle_brake", weight: 3 },
    { id: "rvg_grip", weight: 3 },
    { id: "rk1_grip", weight: 3 },
    { id: "mag_pmag", weight: 2 },
    { id: "moe_stock", weight: 2 },
    { id: "light_stock", weight: 3 },
    { id: "tetriz", weight: 2 },
    { id: "gp_coin", weight: 2 },
    { id: "ledx", weight: 2 },
    { id: "golden_pocket_watch", weight: 1 },
    { id: "bronze_pocket_watch", weight: 1 },
    { id: "suspicious_letter", weight: 1 },
    { id: "church_key", weight: 1 },
    { id: "toilet_paper", weight: 1 },
    { id: "armor_6b13", weight: 4 },
    { id: "water_bottle", weight: 5 },
    { id: "juice", weight: 4 },
    { id: "energy_drink", weight: 3 }
  ];

  const totalWeight = lootTable.reduce((acc, item) => acc + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of lootTable) {
    roll -= entry.weight;
    if (roll <= 0) {
      const original = ALL_ITEMS[entry.id];
      const cloned = JSON.parse(JSON.stringify(original)) as GameItem;
      if (cloned.type === "armor" || cloned.type === "helmet") {
        cloned.durability = cloned.maxDurability;
      }
      return cloned;
    }
  }

  return JSON.parse(JSON.stringify(ALL_ITEMS.cpu_fan)) as GameItem;
};

/**
 * Calculates backpack size based on constitution stat.
 * @param constitution Player's constitution level
 */
export const getBackpackCapacity = (constitution: number): number => {
  return 9 + Math.floor(Math.sqrt(constitution * 30));
};

/**
 * Performs looting phase of a map tile.
 * Rolls up to 3 times for loot depending on base chances and perception skill.
 *
 * @param pmc Player character state
 * @param raid Active raid state (mutated with new loot/logs)
 * @param map Map context
 */
export const executeLootPhase = (pmc: PMCCharacter, raid: RaidState, map: MapData) => {
  const baseLootChance = 0.50; // 50%
  const perceptionLevel = pmc.skills.perception.level;
  const lootChance = baseLootChance + perceptionLevel * 0.01;

  let itemsFoundCount = 0;

  for (let rollIdx = 0; rollIdx < 3; rollIdx++) {
    if (Math.random() < lootChance) {
      const item = rollLootItem(map, pmc.classType === "Lucky" ? 20 : 0);
      const backpackCap = getBackpackCapacity(pmc.skills.constitution.level);
      const currentLoad = raid.lootFound.reduce((acc, entry) => acc + entry.quantity, 0);

      if (currentLoad < backpackCap) {
        const secureCap = 4; // base secure container size
        raid.lootFound.push({ item, quantity: 1 });

        // Sort items into secure container by value
        const allLoot = [...raid.lootFound, ...raid.secureContainerSaved];
        const singleItems: GameItem[] = [];
        allLoot.forEach(e => {
          for (let q = 0; q < e.quantity; q++) singleItems.push(e.item);
        });
        singleItems.sort((a, b) => b.value - a.value);

        const secureSorted: { [id: string]: { item: GameItem; quantity: number } } = {};
        const backpackSorted: { [id: string]: { item: GameItem; quantity: number } } = {};

        singleItems.forEach((single, idx) => {
          if (idx < secureCap) {
            if (!secureSorted[single.id]) secureSorted[single.id] = { item: single, quantity: 0 };
            secureSorted[single.id].quantity++;
          } else {
            if (!backpackSorted[single.id]) backpackSorted[single.id] = { item: single, quantity: 0 };
            backpackSorted[single.id].quantity++;
          }
        });

        raid.secureContainerSaved = Object.values(secureSorted);
        raid.lootFound = Object.values(backpackSorted);

        raid.logs.push(createLog(`Found ${item.name} (Value: ₽${item.value})`, "loot", raid.elapsedSeconds));
        itemsFoundCount++;
      } else {
        raid.logs.push(createLog(`Backpack is full! Left behind discovered loot: ${item.name}.`, "warning", raid.elapsedSeconds));
      }
    }
  }

  if (itemsFoundCount === 0) {
    raid.logs.push(createLog("Searched surrounding areas but found no valuable items.", "info", raid.elapsedSeconds));
  }
};
