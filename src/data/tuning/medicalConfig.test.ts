import { describe, it, expect } from 'vitest';
import { GameItem } from '../../types';
import { findBackupMedical, consumeFoundEntry, BLEED_STOP_COST, DEFAULT_HEAL_RESTORE, LootEntry } from './medicalConfig';

const makeItem = (overrides: Partial<GameItem>): GameItem => ({
  id: "test_item",
  name: "Test Item",
  description: "",
  type: "medical",
  rarity: "common",
  value: 1,
  iconName: "Test",
  ...overrides,
});

const entries = (list: GameItem[]): LootEntry[] => list.map(item => ({ item, quantity: 1 }));

describe('findBackupMedical', () => {
  it('matches medkits by medicalSubType and ignores surgical kits', () => {
    const loot = entries([
      makeItem({ id: "surgical_kit", medicalSubType: "surgical", resourceCurrent: 5, resourceMax: 5 }),
      makeItem({ id: "ifak", medicalSubType: "medkit", resourceCurrent: 300, resourceMax: 300 }),
    ]);

    expect(findBackupMedical(loot, "medkit")).toBe(1);
    expect(findBackupMedical(loot, "surgical")).toBe(0);
  });

  it('returns -1 when no matching kind exists', () => {
    const loot = entries([makeItem({ id: "ifak", medicalSubType: "medkit", resourceCurrent: 100 })]);
    expect(findBackupMedical(loot, "surgical")).toBe(-1);
    expect(findBackupMedical(loot, "provision")).toBe(-1);
  });

  it('gates matches on minResource (>=)', () => {
    const loot = entries([
      makeItem({ id: "ai2", medicalSubType: "medkit", resourceCurrent: 20 }),
      makeItem({ id: "afak", medicalSubType: "medkit", resourceCurrent: 19 }),
    ]);

    expect(findBackupMedical(loot, "medkit", 20)).toBe(0);
    expect(findBackupMedical(loot, "medkit", 21)).toBe(-1);
  });

  it('matches provisions by item type', () => {
    const loot = entries([
      makeItem({ id: "ifak", medicalSubType: "medkit", resourceCurrent: 100 }),
      makeItem({ id: "water_bottle", type: "provision", resourceCurrent: 60 }),
    ]);

    expect(findBackupMedical(loot, "provision")).toBe(1);
  });

  it('requires a positive resourceCurrent', () => {
    const loot = entries([
      makeItem({ id: "ifak", medicalSubType: "medkit", resourceCurrent: 0 }),
      makeItem({ id: "surv12", medicalSubType: "surgical", resourceCurrent: 0 }),
    ]);

    expect(findBackupMedical(loot, "medkit")).toBe(-1);
    expect(findBackupMedical(loot, "surgical")).toBe(-1);
  });
});

describe('consumeFoundEntry', () => {
  it('decrements quantity when a stack remains', () => {
    const loot: LootEntry[] = [{ item: makeItem({ id: "ifak", medicalSubType: "medkit" }), quantity: 3 }];
    consumeFoundEntry(loot, 0);
    expect(loot).toHaveLength(1);
    expect(loot[0].quantity).toBe(2);
  });

  it('removes the entry when it was the last copy', () => {
    const loot: LootEntry[] = [
      { item: makeItem({ id: "ifak", medicalSubType: "medkit" }), quantity: 1 },
      { item: makeItem({ id: "ai2", medicalSubType: "medkit" }), quantity: 1 },
    ];
    consumeFoundEntry(loot, 0);
    expect(loot).toHaveLength(1);
    expect(loot[0].item.id).toBe("ai2");
  });
});

describe('medical cost constants', () => {
  it('exposes the bleed stop cost and default heal restore', () => {
    expect(BLEED_STOP_COST).toBe(20);
    expect(DEFAULT_HEAL_RESTORE).toBe(25);
  });
});
