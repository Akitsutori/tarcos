import { describe, it, expect, vi } from 'vitest';
import { runRaidTick, runRaidTickGenerator } from './raidSimulation';
import { mulberry32, makeGoldenState, makeEnemy } from './characterization/goldenHarness';
import { GameState } from '../types';
import { EngineContext, InterruptHook, ModuleInstance } from './contracts';
import { RAID_END_MODULES } from './behaviors/hideoutModules';
import { BODY_PART_ORDER } from './bodyParts';

const VALID_ACTIONS = ["reload", "cover", "flee", "fire", "wait"] as const;
const VALID_BODY_PARTS = BODY_PART_ORDER;

interface Scenario {
  seed: number;
  maxTicks: number;
  expectedStatus: "kia" | "extracted";
  configure: (state: GameState) => void;
}

const SCENARIOS: Record<string, Scenario> = {
  extraction: {
    seed: 4,
    maxTicks: 300,
    expectedStatus: "extracted",
    configure: () => {},
  },
  combat: {
    seed: 1337,
    maxTicks: 300,
    expectedStatus: "extracted",
    configure: (state) => {
      state.activeRaid.status = "combat";
      state.activeRaid.combatTarget = makeEnemy();
    },
  },
  dehydration: {
    seed: 7,
    maxTicks: 300,
    expectedStatus: "kia",
    configure: (state) => {
      state.pmc.hydration = 0;
    },
  },
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

const drainSyncTick = (gen: Generator<InterruptHook, GameState, unknown>) => {
  const hooks: InterruptHook[] = [];
  let result = gen.next();
  while (!result.done) {
    hooks.push(result.value as InterruptHook);
    result = gen.next();
  }
  return { hooks, state: result.value };
};

const runSyncTicks = (scenario: Scenario): GameState => {
  let state = makeGoldenState();
  scenario.configure(state);
  let ticks = 0;
  while (ticks < scenario.maxTicks) {
    const next = runRaidTick(state);
    state = next;
    ticks++;
    if (!state.activeRaid.isActive) break;
  }
  return state;
};

const runTicksWithHooks = (scenario: Scenario) => {
  let state = makeGoldenState();
  scenario.configure(state);
  const hooks: InterruptHook[] = [];
  let ticks = 0;
  while (ticks < scenario.maxTicks) {
    const drained = drainSyncTick(runRaidTickGenerator(state));
    state = drained.state;
    hooks.push(...drained.hooks);
    ticks++;
    if (!state.activeRaid.isActive) break;
  }
  return { state, hooks, ticks };
};

describe('runRaidTick Generator conversion', () => {
  it('sync drainer of runRaidTickGenerator matches the runRaidTick wrapper', async () => {
    const scenario = SCENARIOS.combat;
    const viaWrapper = await withSeed(scenario.seed, () => {
      let state = makeGoldenState();
      scenario.configure(state);
      return runRaidTick(state);
    });

    const viaDrain = await withSeed(scenario.seed, () => {
      let state = makeGoldenState();
      scenario.configure(state);
      const gen = runRaidTickGenerator(state);
      let result = gen.next();
      while (!result.done) result = gen.next();
      return result.value;
    });

    expect(viaDrain).toEqual(viaWrapper);
  });

  it('emits AFTER_RAID_END with the resolved status exactly once at the terminal tick', async () => {
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      const { hooks, ticks } = await withSeed(scenario.seed, () => runTicksWithHooks(scenario));
      const endHooks = hooks.filter(h => h.hookType === "AFTER_RAID_END");
      expect(endHooks.length).toBe(1);
      expect(endHooks[0].sourceEntityId).toBe("raid");
      expect(endHooks[0].metadata.status).toBe(scenario.expectedStatus);
      expect(name).toBeTruthy();
      expect(ticks).toBeGreaterThanOrEqual(1);
    }
  });

  it('forwards combat BEFORE_ACTION/AFTER_DAMAGE hooks only during combat scenarios', async () => {
    const { hooks: combatHooks } = await withSeed(SCENARIOS.combat.seed, () => runTicksWithHooks(SCENARIOS.combat));
    const beforeActions = combatHooks.filter(h => h.hookType === "BEFORE_ACTION");
    const afterDamages = combatHooks.filter(h => h.hookType === "AFTER_DAMAGE");

    expect(beforeActions.length).toBeGreaterThan(0);
    expect(afterDamages.length).toBeGreaterThan(0);
    expect(beforeActions.every(h => VALID_ACTIONS.includes(h.metadata.action as (typeof VALID_ACTIONS)[number]))).toBe(true);
    expect(afterDamages.every(h => VALID_BODY_PARTS.includes(h.metadata.bodyPart as (typeof VALID_BODY_PARTS)[number]))).toBe(true);
    expect(afterDamages.every(h => (h.metadata.amount as number) > 0)).toBe(true);

    const { hooks: dehydrationHooks } = await withSeed(SCENARIOS.dehydration.seed, () => runTicksWithHooks(SCENARIOS.dehydration));
    expect(dehydrationHooks.filter(h => h.hookType === "BEFORE_ACTION").length).toBe(0);
    expect(dehydrationHooks.filter(h => h.hookType === "AFTER_DAMAGE").length).toBe(0);
  });

  it('returns the input state unchanged and yields no hooks when the raid is inactive', async () => {
    const scenario = SCENARIOS.extraction;
    const result = await withSeed(scenario.seed, async () => {
      const state = makeGoldenState();
      state.activeRaid.isActive = false;
      scenario.configure(state);
      const snapshot = JSON.parse(JSON.stringify(state)) as GameState;
      const drained = drainSyncTick(runRaidTickGenerator(state));
      return { drained, snapshot };
    });
    expect(result.drained.hooks).toHaveLength(0);
    expect(result.drained.state).toEqual(result.snapshot);
  });

  it('does not mutate its input state (Immer structural immutability)', async () => {
    const scenario = SCENARIOS.combat;
    await withSeed(scenario.seed, () => {
      const input = makeGoldenState();
      scenario.configure(input);
      const snapshot = JSON.parse(JSON.stringify(input)) as GameState;
      const result = runRaidTick(input);
      expect(input).toEqual(snapshot);
      expect(result).not.toBe(input);
      expect(result.activeRaid).not.toBe(input.activeRaid);
      expect(result.activeRaid.combatTarget).not.toBe(input.activeRaid.combatTarget);
    });
  });

  it('produces a structurally-shared, frozen result instead of a full-tree clone', async () => {
    const scenario = SCENARIOS.extraction;
    await withSeed(scenario.seed, () => {
      const input = makeGoldenState();
      scenario.configure(input);
      const result = runRaidTick(input);
      expect(result.hideout).toBe(input.hideout);
      expect(result).not.toBe(input);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  it('dispatches registered raid-end modules at the terminal tick (extraction rewards, KIA blocked)', async () => {
    const testModule: ModuleInstance = {
      id: "test_module",
      canExecute: (state: GameState) => state.activeRaid.status === "extracted",
      onRaidEnd: vi.fn((_state: GameState, _hook: InterruptHook, context: EngineContext) => {
        context.emitIntent({ targetEntityId: "stash", type: "STASH_ADD", value: { itemId: "ai2", quantity: 1 } });
      }),
    };
    RAID_END_MODULES.push(testModule);
    try {
      const extraction = await withSeed(SCENARIOS.extraction.seed, () => runTicksWithHooks(SCENARIOS.extraction));
      expect(testModule.onRaidEnd).toHaveBeenCalledTimes(1);
      expect(extraction.state.stash.items.find(e => e.item.id === "ai2")?.quantity).toBe(1);

      const dehydration = await withSeed(SCENARIOS.dehydration.seed, () => runTicksWithHooks(SCENARIOS.dehydration));
      expect(testModule.onRaidEnd).toHaveBeenCalledTimes(1);
      expect(dehydration.state.stash.items.find(e => e.item.id === "ai2")?.quantity).toBeUndefined();
    } finally {
      RAID_END_MODULES.splice(RAID_END_MODULES.indexOf(testModule), 1);
    }
  });
});
