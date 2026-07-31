import { describe, it, expect } from 'vitest';
import { ALL_ITEMS } from './items';
import { HIDE_OUT_MODULE_DEFINITIONS, HIDE_OUT_MODULE_MAX_LEVEL } from './hideout';
import { createInitialHideout } from '../construction';

const HIDEOUT_KEYS = [
  'medstation',
  'workbench',
  'intelligenceCenter',
  'shootingRange',
  'nutritionUnit',
  'scavengerWorkstation',
];

describe('HIDE_OUT_MODULE_DEFINITIONS', () => {
  it('covers exactly the six Hideout module keys', () => {
    expect(Object.keys(HIDE_OUT_MODULE_DEFINITIONS).sort()).toEqual([...HIDEOUT_KEYS].sort());
  });

  it('defines upgrades 1-3 for every module with positive cost and bonus text', () => {
    for (const def of Object.values(HIDE_OUT_MODULE_DEFINITIONS)) {
      for (const level of [1, 2, 3]) {
        const upgrade = def.upgrades[level];
        expect(upgrade, `${def.id} upgrade ${level}`).toBeDefined();
        expect(upgrade.cost).toBeGreaterThan(0);
        expect(upgrade.bonus.length).toBeGreaterThan(0);
        expect(upgrade.requirements.length).toBeGreaterThan(0);
      }
    }
  });

  it('every requirement references an item that exists in ALL_ITEMS', () => {
    for (const def of Object.values(HIDE_OUT_MODULE_DEFINITIONS)) {
      for (const level of [1, 2, 3]) {
        for (const req of def.upgrades[level].requirements) {
          expect(ALL_ITEMS[req.itemId], `${def.id} lvl ${level} requires ${req.itemId}`).toBeDefined();
          expect(req.quantity).toBeGreaterThan(0);
        }
      }
    }
  });

  it('createInitialHideout builds modules from the definitions at level 0', () => {
    const hideout = createInitialHideout();
    for (const key of HIDEOUT_KEYS) {
      const module = hideout[key];
      const def = HIDE_OUT_MODULE_DEFINITIONS[key];
      expect(module.id).toBe(def.id);
      expect(module.name).toBe(def.name);
      expect(module.description).toBe(def.description);
      expect(module.iconName).toBe(def.iconName);
      expect(module.level).toBe(0);
      expect(module.maxLevel).toBe(HIDE_OUT_MODULE_MAX_LEVEL);
      expect(module.upgrades).toEqual(def.upgrades);
    }
  });
});
