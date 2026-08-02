import { describe, it, expect } from 'vitest';
import { addArmorToStash, sortLootIntoContainers } from './lootManagement';
import { GameItem, Stash } from '../types';
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

describe('addArmorToStash', () => {
  const makeStash = (): Stash => ({ items: [], roubles: 0, weapons: [], equippedWeaponId: "" });

  it('creates a lone entry (quantity 0) for the first piece of a type', () => {
    const stash = makeStash();
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23 });
    expect(stash.items).toHaveLength(1);
    expect(stash.items[0].item.id).toBe("armor_6b23");
    expect(stash.items[0].item.durability).toBe(ALL_ITEMS.armor_6b23.maxDurability);
    expect(stash.items[0].quantity).toBe(0);
  });

  it('counts same-id full pieces as backups (quantity increments)', () => {
    const stash = makeStash();
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23 });
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23 });
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23 });
    expect(stash.items).toHaveLength(1);
    expect(stash.items[0].quantity).toBe(2);
    expect(stash.items[0].item.durability).toBe(ALL_ITEMS.armor_6b23.maxDurability);
  });

  it('replaces the shown item with a lower-durability piece (old one becomes a backup)', () => {
    const stash = makeStash();
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23, durability: 33 });
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23, durability: 12 });
    expect(stash.items).toHaveLength(1);
    expect(stash.items[0].item.durability).toBe(12);
    expect(stash.items[0].quantity).toBe(1);
  });

  it('keeps a higher-durability piece as a backup (shown piece unchanged)', () => {
    const stash = makeStash();
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23, durability: 12 });
    addArmorToStash(stash, { ...ALL_ITEMS.armor_6b23, durability: 45 });
    expect(stash.items).toHaveLength(1);
    expect(stash.items[0].item.durability).toBe(12);
    expect(stash.items[0].quantity).toBe(1);
  });

  it('keeps distinct armor ids in separate stacks', () => {
    const stash = makeStash();
    addArmorToStash(stash, { ...ALL_ITEMS.paca });
    addArmorToStash(stash, { ...ALL_ITEMS.ssh68 });
    expect(stash.items).toHaveLength(2);
    expect(stash.items.map(e => e.item.id).sort()).toEqual(["paca", "ssh68"]);
  });
});
