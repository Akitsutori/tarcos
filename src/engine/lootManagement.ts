import { GameItem, RaidState } from "../types";

export type LootStack = { item: GameItem; quantity: number }[];

/**
 * Whether an item is a durability-tracked armor/helmet piece. Such pieces are
 * instances: each one keeps its own durability and is never stacked by id.
 */
export const isArmorItem = (item: GameItem): boolean =>
  item.type === "armor" || item.type === "helmet";

/**
 * Adds one item to a bucket, merging only non-armor items by id. Armor/helmet
 * pieces always become their own `{ item, quantity: 1 }` entry so per-piece
 * durability survives sorting.
 */
const addToBucket = (bucket: LootStack, item: GameItem): void => {
  if (isArmorItem(item)) {
    bucket.push({ item, quantity: 1 });
    return;
  }
  const existing = bucket.find(e => e.item.id === item.id);
  if (existing) existing.quantity++;
  else bucket.push({ item, quantity: 1 });
};

/**
 * Single-source-of-truth "try to add one loot item to the raid" step:
 * rejects when the backpack is full, otherwise pushes the item and re-sorts
 * loot across backpack + secure container by value.
 *
 * @returns true when the item was kept, false when the backpack was full.
 */
export const allocateLoot = (
  raid: RaidState,
  item: GameItem,
  backpackCapacity: number,
  secureCap: number
): boolean => {
  const currentLoad = raid.lootFound.reduce((acc, entry) => acc + entry.quantity, 0);

  if (currentLoad >= backpackCapacity) return false;

  raid.lootFound.push({ item, quantity: 1 });

  const { lootFound, secureContainerSaved } = sortLootIntoContainers(
    [...raid.lootFound, ...raid.secureContainerSaved],
    secureCap
  );
  raid.lootFound = lootFound;
  raid.secureContainerSaved = secureContainerSaved;

  return true;
};

export const sortLootIntoContainers = (
  allLoot: LootStack,
  secureCap: number
): { lootFound: LootStack; secureContainerSaved: LootStack } => {
  const singleItems: GameItem[] = [];
  allLoot.forEach(e => {
    for (let q = 0; q < e.quantity; q++) singleItems.push(e.item);
  });
  singleItems.sort((a, b) => b.value - a.value);

  const secureSorted: LootStack = [];
  const backpackSorted: LootStack = [];

  singleItems.forEach((single, idx) => {
    if (idx < secureCap) addToBucket(secureSorted, single);
    else addToBucket(backpackSorted, single);
  });

  return {
    lootFound: backpackSorted,
    secureContainerSaved: secureSorted,
  };
};
