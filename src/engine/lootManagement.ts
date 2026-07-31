import { GameItem } from "../types";
import { secureContainerCapacity } from "../data/tuning/hideoutConfig";

export type LootStack = { item: GameItem; quantity: number }[];

export const SECURE_CONTAINER_CAPACITY = (hideoutLevel: number): number =>
  secureContainerCapacity(hideoutLevel);

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
