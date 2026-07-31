import { describe, it, expect, vi } from 'vitest';
import { simulateCombatRound, simulateCombatRoundGenerator } from './combat';
import { spawnEnemy } from './spawning';
import { ALL_MAPS } from '../data/content/maps';
import { ALL_ITEMS } from '../data/content/items';
import { INITIAL_WEAPONS } from '../data/content/weapons';
import { getWeaponStats, createInitialPMC, createInitialHideout } from '../data';
import { ClassType, RaidState, GameState, PMCCharacter, EnemyState, Weapon } from '../types';
import { createEngineContext } from './engineContext';
import { EngineContext, InterruptHook } from './types';
import { mulberry32, makeEnemy } from './characterization/goldenHarness';
import { BODY_PART_ORDER } from './bodyParts';

const VALID_ACTIONS = ["reload", "cover", "flee", "fire", "wait"] as const;
const VALID_BODY_PARTS = BODY_PART_ORDER;

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
  killsByTier: { Scav: 0, PMC: 0, Boss: 0 },
});

const setup = () => {
  const pmc = createInitialPMC(ClassType.SOLDIER);
  const enemy = spawnEnemy(ALL_MAPS[0], pmc.level);
  const weapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER])) as Weapon;
  const weaponStats = getWeaponStats(weapon, 0);
  const raid = createMockRaid();
  raid.combatTarget = enemy;
  const context = createTestContext(pmc, enemy, weapon, raid);
  return { pmc, enemy, weapon, weaponStats, raid, context };
};

const withSeed = async <T>(seed: number, fn: () => T | Promise<T>): Promise<T> => {
  const rng = mulberry32(seed);
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => rng());
  try {
    return await fn();
  } finally {
    spy.mockRestore();
  }
};

const drainSync = (gen: Generator<InterruptHook, ReturnType<typeof simulateCombatRound>, unknown>) => {
  const hooks: InterruptHook[] = [];
  let result = gen.next();
  while (!result.done) {
    hooks.push(result.value as InterruptHook);
    result = gen.next();
  }
  return { hooks, logs: result.value };
};

describe('simulateCombatRound Generator conversion', () => {
  it('yields only BEFORE_ACTION and AFTER_DAMAGE hooks with valid metadata', async () => {
    const { hooks } = await withSeed(1337, () => {
      const { pmc, enemy, weapon, weaponStats, raid, context } = setup();
      return drainSync(simulateCombatRoundGenerator(pmc, enemy, weapon, weaponStats, 60, raid, 0, context));
    });

    const beforeActions = hooks.filter(h => h.hookType === "BEFORE_ACTION");
    const afterDamages = hooks.filter(h => h.hookType === "AFTER_DAMAGE");

    expect(hooks.length).toBe(beforeActions.length + afterDamages.length);
    expect(beforeActions.length).toBeGreaterThan(0);
    expect(beforeActions.every(h => VALID_ACTIONS.includes(h.metadata.action as (typeof VALID_ACTIONS)[number]))).toBe(true);
    expect(afterDamages.every(h => VALID_BODY_PARTS.includes(h.metadata.bodyPart as (typeof VALID_BODY_PARTS)[number]))).toBe(true);
    expect(afterDamages.every(h => (h.metadata.amount as number) > 0)).toBe(true);
  });

  it('BEFORE_ACTION always precedes the first AFTER_DAMAGE and hook count matches DMG logs', async () => {
    const seed = 9090;
    const { logs, hooks } = await withSeed(seed, () => {
      const { pmc, enemy, weapon, weaponStats, raid, context } = setup();
      return drainSync(simulateCombatRoundGenerator(pmc, enemy, weapon, weaponStats, 60, raid, 0, context));
    });

    const dmgLogs = logs.filter(l => l.type === "combat_damage" && l.message.includes('[DMG]')).length;
    const afterDamages = hooks.filter(h => h.hookType === "AFTER_DAMAGE");

    const firstActionIndex = hooks.findIndex(h => h.hookType === "BEFORE_ACTION");
    const firstDamageIndex = hooks.findIndex(h => h.hookType === "AFTER_DAMAGE");
    expect(firstActionIndex).toBeGreaterThanOrEqual(0);
    expect(firstActionIndex).toBeLessThan(firstDamageIndex);

    expect(afterDamages.length).toBe(dmgLogs);
  });

  it('enemy 9x19 shots at a SCOUT PMC use baseline pen 20 (SMG bonus is attacker-only)', async () => {
    const seed = 9;
    const logs = await withSeed(seed, () => {
      const pmc = createInitialPMC(ClassType.SCOUT);
      pmc.equippedArmor = { ...ALL_ITEMS.armor_6b23 }; // Class 3 full dur -> threshold 30: pen 20 BLOCKs, pen 32 PENETRATEs
      const enemy = makeEnemy();
      enemy.equippedWeapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SCOUT])) as Weapon; // 9x19 SMG
      const weapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SCOUT])) as Weapon;
      const weaponStats = getWeaponStats(weapon, 0);
      const raid = createMockRaid();
      raid.combatTarget = enemy;
      const context = createTestContext(pmc, enemy, weapon, raid);
      return simulateCombatRound(pmc, enemy, weapon, weaponStats, 60, raid, 0, context);
    });

    const penLogs = logs.filter(l => l.message.includes('[PEN]'));
    expect(penLogs.length).toBeGreaterThan(0);
    expect(penLogs.every(l => l.message.includes('BLOCKED'))).toBe(true);
  });
});
