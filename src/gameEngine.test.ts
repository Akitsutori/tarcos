import { describe, it, expect } from 'vitest';
import { spawnEnemy, getBackpackCapacity, rollLootItem, simulateCombatRound } from './gameEngine';
import { ALL_MAPS } from './data/content/maps';
import { ALL_ITEMS } from './data/content/items';
import { INITIAL_WEAPONS } from './data/content/weapons';
import { getWeaponStats, createInitialPMC, createInitialHideout } from './data';
import { ClassType, RaidState, GameState, PMCCharacter, EnemyState, Weapon } from './types';
import { createEngineContext } from './engine/engineContext';
import { EngineContext } from './engine/types';

const createTestContext = (pmc: PMCCharacter, enemy: EnemyState, weapon: Weapon, raid: RaidState): EngineContext => {
  const state: GameState = {
    pmc,
    stash: { items: [], roubles: 0, weapons: [weapon], equippedWeaponId: weapon.id },
    hideout: createInitialHideout(),
    activeRaid: raid,
    selectedMapId: ALL_MAPS[0].id,
    activeQuests: [],
    completedQuestIds: [],
    pastRaidOutcomes: [],
  };
  return createEngineContext(state).context;
};

describe('GameEngine Basics', () => {
  it('calculates backpack capacity correctly based on constitution', () => {
    // formula: 9 + floor(sqrt(con * 30))
    // con = 5 => sqrt(150) = 12.24 => 9 + 12 = 21
    expect(getBackpackCapacity(5)).toBe(21);
    // con = 1 => sqrt(30) = 5.47 => 9 + 5 = 14
    expect(getBackpackCapacity(1)).toBe(14);
  });

  it('spawns an enemy successfully with valid body parts and skills', () => {
    const map = ALL_MAPS[0]; // factory
    const pmcLevel = 5;
    const enemy = spawnEnemy(map, pmcLevel);
    
    expect(enemy.name).toBeDefined();
    expect(enemy.tier).toMatch(/Scav|PMC|Boss/);
    expect(enemy.level).toBeGreaterThan(0);
    expect(enemy.bodyParts.head.max).toBeGreaterThan(0);
    expect(enemy.skills.weaponSkill.level).toBeGreaterThan(0);
    expect(enemy.isDead).toBe(false);
  });

  it('rolls a valid loot item from the map', () => {
    const map = ALL_MAPS[0];
    const item = rollLootItem(map);
    expect(item).toBeDefined();
    expect(item.id).toBeDefined();
    expect(ALL_ITEMS[item.id]).toBeDefined(); // item exists in DB
  });
});

describe('Combat Diagnostics', () => {
  const createMockRaid = (): RaidState => ({
    isActive: true,
    map: ALL_MAPS[0],
    tiles: [],
    currentStage: 0,
    status: "combat",
    combatTarget: null,
    logs: [],
    lootFound: [],
    secureContainerSaved: [],
    elapsedSeconds: 60,
    playSpeed: 1,
    usedMedkitDuringRaid: false,
    reinforcementsSpawnedThisTile: 0,
    killsByTier: { Scav: 0, PMC: 0, Boss: 0 }
  });

  it('simulateCombatRound produces combat logs over multiple rounds', () => {
    const pmc = createInitialPMC(ClassType.SOLDIER);
    const enemy = spawnEnemy(ALL_MAPS[0], pmc.level);
    const weapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER]));
    const weaponStats = getWeaponStats(weapon, 0);

    let totalBurstLogs = 0;
    let totalAccLogs = 0;
    let totalDmgLogs = 0;
    let totalRoundLogs = 0;

    for (let round = 0; round < 20; round++) {
      const raid = createMockRaid();
      raid.combatTarget = enemy;
      const context = createTestContext(pmc, enemy, weapon, raid);
      const logs = simulateCombatRound(pmc, enemy, weapon, weaponStats, 60 + round * 15, raid, 0, context);

      totalBurstLogs += logs.filter(l => l.message.includes('burst spray')).length;
      totalAccLogs += logs.filter(l => l.message.includes('[ACC]')).length;
      totalDmgLogs += logs.filter(l => l.message.includes('[DMG]')).length;
      totalRoundLogs += logs.filter(l => l.type === "combat_round").length;

      const pmcDead = pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0;
      const enemyDead = enemy.bodyParts.head.current <= 0 || enemy.bodyParts.thorax.current <= 0;
      if (pmcDead || enemyDead) break;
    }

    expect(totalBurstLogs).toBeGreaterThan(0);
    expect(totalAccLogs).toBeGreaterThan(0);
    expect(totalRoundLogs).toBeGreaterThan(0);
  });

  it('simulateCombatRound deals damage over multiple rounds', () => {
    const pmc = createInitialPMC(ClassType.SOLDIER);
    const enemy = spawnEnemy(ALL_MAPS[0], pmc.level);

    const pmcTotalBefore = Object.values(pmc.bodyParts).reduce((s, p) => s + p.current, 0);
    const enemyTotalBefore = Object.values(enemy.bodyParts).reduce((s, p) => s + p.current, 0);

    const weapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER]));
    const weaponStats = getWeaponStats(weapon, 0);

    for (let i = 0; i < 20; i++) {
      const raid = createMockRaid();
      raid.combatTarget = enemy;
      const context = createTestContext(pmc, enemy, weapon, raid);
      simulateCombatRound(pmc, enemy, weapon, weaponStats, 60 + i * 15, raid, 0, context);
      const pmcDead = pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0;
      const enemyDead = enemy.bodyParts.head.current <= 0 || enemy.bodyParts.thorax.current <= 0;
      if (pmcDead || enemyDead) break;
    }

    const pmcTotalAfter = Object.values(pmc.bodyParts).reduce((s, p) => s + p.current, 0);
    const enemyTotalAfter = Object.values(enemy.bodyParts).reduce((s, p) => s + p.current, 0);

    const pmcTookDamage = pmcTotalAfter < pmcTotalBefore;
    const enemyTookDamage = enemyTotalAfter < enemyTotalBefore;

    expect(pmcTookDamage || enemyTookDamage).toBe(true);
  });

  it('simulateCombatRound produces combat_round logs over multiple rounds', () => {
    const pmc = createInitialPMC(ClassType.SOLDIER);
    const enemy = spawnEnemy(ALL_MAPS[0], pmc.level);
    const weapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER]));
    const weaponStats = getWeaponStats(weapon, 0);

    let roundLogs: string[] = [];
    for (let i = 0; i < 20; i++) {
      const raid = createMockRaid();
      raid.combatTarget = enemy;
      const context = createTestContext(pmc, enemy, weapon, raid);
      const logs = simulateCombatRound(pmc, enemy, weapon, weaponStats, 60 + i * 15, raid, 0, context);
      const rounds = logs.filter(l => l.type === "combat_round");
      rounds.forEach(l => roundLogs.push(l.message));

      const pmcDead = pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0;
      const enemyDead = enemy.bodyParts.head.current <= 0 || enemy.bodyParts.thorax.current <= 0;
      if (pmcDead || enemyDead) break;
    }

    expect(roundLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('combat resolves within 100 ticks (no infinite loop)', () => {
    const pmc = createInitialPMC(ClassType.SOLDIER);
    const enemy = spawnEnemy(ALL_MAPS[0], pmc.level);
    const weapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER]));
    const weaponStats = getWeaponStats(weapon, 0);

    let combatResolved = false;
    for (let tick = 0; tick < 100; tick++) {
      const raid = createMockRaid();
      raid.combatTarget = enemy;
      const context = createTestContext(pmc, enemy, weapon, raid);
      simulateCombatRound(pmc, enemy, weapon, weaponStats, 60 + tick * 15, raid, 0, context);

      const pmcDead = pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0;
      const enemyDead = enemy.bodyParts.head.current <= 0 || enemy.bodyParts.thorax.current <= 0;

      if (pmcDead || enemyDead) {
        combatResolved = true;
        break;
      }
    }

    expect(combatResolved).toBe(true);
  });
});
