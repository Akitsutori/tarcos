import { MapData, GameItem, PMCCharacter, RaidState } from "../types";
import { ALL_ITEMS } from "../data";
import { createLog } from "./utils";

// Zentrale Rarity-Gewichtung — alle Items mit dieser Gewichtung, keine individuellen Gewichte
const RARITY_WEIGHT: Record<string, number> = {
  common: 5,
  rare: 3,
  epic: 2,
  legendary: 1,
};

/**
 * Rolls a random item from the loot table.
 * Dynamisch aus ALL_ITEMS gebaut — dropWeight > 0 = droppbar, Gewicht via RARITY_WEIGHT.
 */
export const rollLootItem = (map: MapData): GameItem => {
  const lootTable = Object.values(ALL_ITEMS)
    .filter(item => (item.dropWeight ?? 0) > 0 && (RARITY_WEIGHT[item.rarity] ?? 0) > 0)
    .map(item => ({ item, weight: RARITY_WEIGHT[item.rarity] }));

  const totalWeight = lootTable.reduce((acc, e) => acc + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of lootTable) {
    roll -= entry.weight;
    if (roll <= 0) {
      const cloned = JSON.parse(JSON.stringify(entry.item)) as GameItem;
      if (cloned.type === "armor" || cloned.type === "helmet") {
        cloned.durability = cloned.maxDurability;
      }
      return cloned;
    }
  }

  // Fallback: erster Common
  const fallback = lootTable.find(e => e.item.rarity === "common");
  return JSON.parse(JSON.stringify(fallback?.item ?? ALL_ITEMS.ai2)) as GameItem;
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
  const baseLootChance = 0.50;
  const perceptionLevel = pmc.skills.perception.level;
  const mapMult = map.lootMultiplier ?? 1.0;
  const lootChance = Math.min(0.95, (baseLootChance + perceptionLevel * 0.01) * mapMult);

  const baseRolls = 3;
  const luckyBonus = pmc.classType === "Lucky" ? 1 : 0;
  const totalRolls = baseRolls + luckyBonus;

  let itemsFoundCount = 0;

  for (let rollIdx = 0; rollIdx < totalRolls; rollIdx++) {
    if (Math.random() < lootChance) {
      const item = rollLootItem(map);
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
