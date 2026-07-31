import { describe, it, expect, vi } from 'vitest';
import { ALL_MAPS, INITIAL_WEAPONS, ALL_ITEMS } from '../../data';
import { spawnEnemy } from '../../engine/spawning';
import { ENEMY_SPAWN_PROFILES, LEVEL_STAT_SCALE, ENCOUNTER_CHANCE, REINFORCEMENT_MAX_PER_TILE, REINFORCEMENT_CHANCE, EnemyTier, LevelConfig, WeaponConfig } from './enemySpawning';

const ALL_TIERS: EnemyTier[] = ["Scav", "PMC", "Boss"];

describe('enemySpawning profiles', () => {
  it('provides name pools for Scav and PMC tiers', () => {
    expect(ENEMY_SPAWN_PROFILES.Scav.names.length).toBeGreaterThan(0);
    expect(ENEMY_SPAWN_PROFILES.PMC.names.length).toBeGreaterThan(0);
  });

  it('defines valid stat ranges for every tier', () => {
    for (const tier of ALL_TIERS) {
      const ranges = Object.values(ENEMY_SPAWN_PROFILES[tier].statRanges);
      expect(ranges.length).toBe(5);
      for (const [min, max] of ranges) {
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeGreaterThanOrEqual(min);
        expect(max).toBeLessThanOrEqual(100);
      }
      expect(ENEMY_SPAWN_PROFILES[tier].baseAccuracy).toBeGreaterThan(0);
      expect(ENEMY_SPAWN_PROFILES[tier].baseAccuracy).toBeLessThanOrEqual(100);
    }
  });

  it('defines valid weapon configs for every tier', () => {
    const bossWpn = ENEMY_SPAWN_PROFILES.Boss.weapon as Extract<WeaponConfig, { mode: "pool" }>;
    expect(bossWpn.mode).toBe("pool");
    expect(bossWpn.pool.length).toBeGreaterThan(0);

    const pmcWpn = ENEMY_SPAWN_PROFILES.PMC.weapon as Extract<WeaponConfig, { mode: "choice" }>;
    expect(pmcWpn.mode).toBe("choice");
    expect(pmcWpn.chance).toBeGreaterThan(0);
    expect(pmcWpn.chance).toBeLessThan(1);

    const scavWpn = ENEMY_SPAWN_PROFILES.Scav.weapon as Extract<WeaponConfig, { mode: "split" }>;
    expect(scavWpn.mode).toBe("split");
    expect(scavWpn.pistolChance).toBeGreaterThan(0);
    expect(scavWpn.pistolChance).toBeLessThan(1);
    expect(scavWpn.pool.length).toBeGreaterThan(0);
  });

  it('defines valid equipment tables for every tier', () => {
    for (const tier of ALL_TIERS) {
      const { armor, helmet } = ENEMY_SPAWN_PROFILES[tier];
      expect(armor.pool.length).toBeGreaterThan(0);
      expect(helmet.pool.length).toBeGreaterThan(0);
      if (armor.gate !== undefined) {
        expect(armor.gate).toBeGreaterThan(0);
        expect(armor.gate).toBeLessThanOrEqual(1);
      }
    }
  });

  it('spawn constants are within valid ranges', () => {
    expect(ENCOUNTER_CHANCE).toBeGreaterThan(0);
    expect(ENCOUNTER_CHANCE).toBeLessThanOrEqual(1);
    expect(REINFORCEMENT_MAX_PER_TILE).toBeGreaterThan(0);
    expect(REINFORCEMENT_CHANCE).toBeGreaterThan(0);
    expect(REINFORCEMENT_CHANCE).toBeLessThanOrEqual(1);
    expect(LEVEL_STAT_SCALE).toBeGreaterThan(0);
  });

  it('spawnEnemy reads Boss profile deterministically (all rolls at minimum)', () => {
    const pmcLevel = 10;
    const queue = new Array(9).fill(0);
    vi.spyOn(Math, 'random').mockImplementation(() => queue.shift() ?? 0);

    const enemy = spawnEnemy(ALL_MAPS[0], pmcLevel);
    vi.restoreAllMocks();

    expect(enemy.tier).toBe("Boss");
    expect(enemy.name).toBe(ALL_MAPS[0].bossName);
    expect(enemy.level).toBe(pmcLevel + 5);
    const bossWpn = ENEMY_SPAWN_PROFILES.Boss.weapon as Extract<WeaponConfig, { mode: "pool" }>;
    expect(enemy.equippedWeapon.name).toBe(INITIAL_WEAPONS[bossWpn.pool[0]].name);
    expect(enemy.equippedArmor!.id).toBe(ENEMY_SPAWN_PROFILES.Boss.armor.pool[0].id);
    expect(enemy.equippedHelmet!.id).toBe(ENEMY_SPAWN_PROFILES.Boss.helmet.pool[0].id);
    expect(enemy.baseAccuracy).toBe(ENEMY_SPAWN_PROFILES.Boss.baseAccuracy);

    const levelBonus = Math.floor((enemy.level - 1) * LEVEL_STAT_SCALE);
    expect(enemy.skills.initiative.level).toBe(ENEMY_SPAWN_PROFILES.Boss.statRanges.initiative[0] + levelBonus);
    expect(enemy.skills.constitution.level).toBe(ENEMY_SPAWN_PROFILES.Boss.statRanges.constitution[0] + levelBonus);
    expect(enemy.bodyParts.head.max).toBe(15 + 3 * enemy.skills.constitution.level);
  });

  it('spawnEnemy readies a Scav with the split weapon roll (pistol branch)', () => {
    const queue = [0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    vi.spyOn(Math, 'random').mockImplementation(() => queue.shift() ?? 0);

    const enemy = spawnEnemy(ALL_MAPS[0], 20);
    vi.restoreAllMocks();

    const scavWpn = ENEMY_SPAWN_PROFILES.Scav.weapon as Extract<WeaponConfig, { mode: "split" }>;
    const scavLvl = ENEMY_SPAWN_PROFILES.Scav.level as Extract<LevelConfig, { mode: "subtract" }>;
    expect(enemy.tier).toBe("Scav");
    expect(enemy.equippedWeapon.id).toBe(scavWpn.pistol.id);
    expect(enemy.level).toBe(20 - scavLvl.offset);
  });

  it('spawnEnemy readies a Scav with the split weapon roll (pool branch)', () => {
    const queue = new Array(12).fill(0.6);
    vi.spyOn(Math, 'random').mockImplementation(() => queue.shift() ?? 0);

    const enemy = spawnEnemy(ALL_MAPS[0], 20);
    vi.restoreAllMocks();

    const scavWpn = ENEMY_SPAWN_PROFILES.Scav.weapon as Extract<WeaponConfig, { mode: "split" }>;
    expect(enemy.tier).toBe("Scav");
    expect(enemy.equippedWeapon.id).not.toBe(scavWpn.pistol.id);
    expect(scavWpn.pool.map(c => INITIAL_WEAPONS[c].id)).toContain(enemy.equippedWeapon.id);
  });
});
