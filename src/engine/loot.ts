import { MapData, GameItem, PMCCharacter, RaidState, Quest } from "../types";
import { ALL_ITEMS } from "../data/content/items";
import { createLog } from "./utils";
import { allocateLoot } from "./lootManagement";
import { secureContainerCapacity } from "../data/tuning/hideoutConfig";
import { getLuckyLootRolls } from "./behaviors/classPassives";
import {
  LOOT_RARITY_WEIGHT,
  LOOT_BASE_CHANCE,
  LOOT_CHANCE_CAP,
  LOOT_PERCEPTION_PER_LEVEL,
  LOOT_BASE_ROLLS,
  BACKPACK_CAPACITY_BASE,
  BACKPACK_CAPACITY_CONSTITUTION_FACTOR,
} from "../data/tuning/lootConfig";

/**
 * Rolls a random item from the loot table.
 * Built from ALL_ITEMS — only rarities with a positive RARITY_WEIGHT drop.
 */
export const rollLootItem = (map: MapData): GameItem => {
  const lootTable = Object.values(ALL_ITEMS)
    .filter(item => (LOOT_RARITY_WEIGHT[item.rarity] ?? 0) > 0)
    .map(item => ({ item, weight: LOOT_RARITY_WEIGHT[item.rarity] }));

  const totalWeight = lootTable.reduce((acc, e) => acc + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of lootTable) {
    roll -= entry.weight;
    if (roll <= 0) {
      const cloned = structuredClone(entry.item);
      if (cloned.type === "armor" || cloned.type === "helmet") {
        cloned.durability = cloned.maxDurability;
      }
      return cloned;
    }
  }

  // Fallback: first common item in the table
  const fallback = lootTable.find(e => e.item.rarity === "common");
  return structuredClone(fallback?.item ?? ALL_ITEMS.ai2);
};

/**
 * Calculates backpack size based on constitution stat.
 * @param constitution Player's constitution level
 */
export const getBackpackCapacity = (constitution: number): number => {
  return BACKPACK_CAPACITY_BASE + Math.floor(Math.sqrt(constitution * BACKPACK_CAPACITY_CONSTITUTION_FACTOR));
};

/**
 * True when the item id is the objective of an active, incomplete Find/Collect quest.
 */
export const isQuestItem = (itemId: string, activeQuests: Quest[]): boolean =>
  activeQuests.some(q => !q.completed && (q.type === "Find" || q.type === "Collect") && q.target === itemId);

/**
 * Performs looting phase of a map tile.
 * Rolls up to 3 times for loot depending on base chances and perception skill.
 *
 * @param pmc Player character state
 * @param raid Active raid state (mutated with new loot/logs)
 * @param map Map context
 * @param activeQuests Active quest pool, used to flag quest-objective loot
 */
export const executeLootPhase = (pmc: PMCCharacter, raid: RaidState, map: MapData, intelligenceCenterLevel: number, activeQuests: Quest[]) => {
  const perceptionLevel = pmc.skills.perception.level;
  const mapMult = map.lootMultiplier ?? 1.0;
  const lootChance = Math.min(LOOT_CHANCE_CAP, (LOOT_BASE_CHANCE + perceptionLevel * LOOT_PERCEPTION_PER_LEVEL) * mapMult);

  const luckyBonus = getLuckyLootRolls(pmc.classType);
  const totalRolls = LOOT_BASE_ROLLS + luckyBonus;

  let itemsFoundCount = 0;

  for (let rollIdx = 0; rollIdx < totalRolls; rollIdx++) {
    if (Math.random() < lootChance) {
      const item = rollLootItem(map);
      const backpackCap = getBackpackCapacity(pmc.skills.constitution.level);

      if (allocateLoot(raid, item, backpackCap, secureContainerCapacity(intelligenceCenterLevel))) {
        const questMarker = isQuestItem(item.id, activeQuests) ? " (Quest Item)" : "";
        raid.logs.push(createLog(`Found ${item.name} (Value: ₽${item.value})${questMarker}`, "loot", raid.elapsedSeconds));
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
