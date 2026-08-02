import { describe, it, expect } from 'vitest';
import { sortLootIntoContainers } from './lootManagement';
import { GameItem } from '../types';
import { ALL_ITEMS } from '../data/content/items';

const makeItem = (id: string, value: number): GameItem => ({
  id,
  name: id,
  description: "",
  type: "valuable",
  rarity: "common",
  value,
  iconName: "gem",
});

describe('sortLootIntoContainers', () => {
  it('partitions highest-value items into the secure container in value order', () => {
    const items = [makeItem("a", 10), makeItem("b", 50), makeItem("c", 30), makeItem("d", 20)];
    const allLoot = items.map(item => ({ item, quantity: 1 }));

    const { lootFound, secureContainerSaved } = sortLootIntoContainers(allLoot, 2);

    expect(secureContainerSaved.map(e => e.item.id)).toEqual(["b", "c"]);
    expect(lootFound.map(e => e.item.id)).toEqual(["d", "a"]);
  });

  it('aggregates identical items by id while preserving value order', () => {
    const item = makeItem("a", 50);
    const allLoot = [{ item, quantity: 2 }, { item: makeItem("b", 30), quantity: 1 }];

    const { lootFound, secureContainerSaved } = sortLootIntoContainers(allLoot, 2);

    expect(secureContainerSaved).toEqual([{ item, quantity: 2 }]);
    expect(lootFound.map(e => e.item.id)).toEqual(["b"]);
  });

  it('places everything in the backpack when secureCap is 0', () => {
    const items = [makeItem("a", 10), makeItem("b", 20)];
    const allLoot = items.map(item => ({ item, quantity: 1 }));

    const { lootFound, secureContainerSaved } = sortLootIntoContainers(allLoot, 0);

    expect(secureContainerSaved).toEqual([]);
    expect(lootFound.map(e => e.item.id)).toEqual(["b", "a"]);
  });

  it('places everything in the secure container when secureCap exceeds item count', () => {
    const items = [makeItem("a", 10), makeItem("b", 20)];
    const allLoot = items.map(item => ({ item, quantity: 1 }));

    const { lootFound, secureContainerSaved } = sortLootIntoContainers(allLoot, 5);

    expect(secureContainerSaved.map(e => e.item.id)).toEqual(["b", "a"]);
    expect(lootFound).toEqual([]);
  });

  it('keeps armor/helmet pieces as separate instances with per-piece durability', () => {
    const pieceA = { ...ALL_ITEMS.armor_6b23, durability: 40 };
    const pieceB = { ...ALL_ITEMS.armor_6b23, durability: 45 };
    const allLoot = [{ item: pieceA, quantity: 1 }, { item: pieceB, quantity: 1 }];

    const { lootFound, secureContainerSaved } = sortLootIntoContainers(allLoot, 0);

    expect(secureContainerSaved).toEqual([]);
    expect(lootFound).toHaveLength(2);
    expect(lootFound.map(e => e.quantity)).toEqual([1, 1]);
    expect(lootFound.map(e => e.item.durability).sort()).toEqual([40, 45]);
  });
});
