import { GameItem, RaidState } from "../types";

export type LootStack = { item: GameItem; quantity: number }[];

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

  return {
    lootFound: Object.values(backpackSorted),
    secureContainerSaved: Object.values(secureSorted),
  };
};
