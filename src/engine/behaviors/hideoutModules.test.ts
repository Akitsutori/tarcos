import { describe, it, expect, vi } from 'vitest';
import { RAID_END_MODULES, dispatchRaidEndModules, scavengerWorkstationModule } from './hideoutModules';
import { createEngineContext } from '../engineContext';
import { makeGoldenState, installSeed } from '../characterization/goldenHarness';
import { runRaidTick } from '../raidSimulation';
import { GameState } from '../../types';
import { EngineContext, InterruptHook, ModuleInstance } from '../types';
import { computeScavengerWorkstationQuantity, SCAVENGER_WORKSTATION_REWARD_BY_LEVEL } from '../../data/tuning/hideoutConfig';

const makeHook = (status: string): InterruptHook => ({
  sourceEntityId: "raid",
  hookType: "AFTER_RAID_END",
  metadata: { status },
});

const makeModule = (overrides: Partial<ModuleInstance> = {}): ModuleInstance => ({
  id: "test_module",
  canExecute: () => true,
  onRaidEnd: () => {},
  ...overrides,
});

const levelUp = (state: GameState, level: number) => {
  state.hideout.scavengerWorkstation.level = level;
};

describe('RAID_END_MODULES registry', () => {
  it('ships exactly the Scavenger Workstation module', () => {
    expect(RAID_END_MODULES.map(m => m.id)).toEqual(["scavengerWorkstation"]);
  });
});

describe('dispatchRaidEndModules', () => {
  it('is a no-op with the default level-0 hideout (workstation inactive)', () => {
    const state = makeGoldenState();
    const context = createEngineContext(state).context;

    expect(() => dispatchRaidEndModules(state, makeHook("extracted"), context)).not.toThrow();
    expect(state.stash.items).toEqual([]);
    expect(state.hideout.scavengerWorkstation.lastProducedAtRaidIndex).toBeUndefined();
  });

  it('skips a module whose canExecute gate rejects the state', () => {
    const state = makeGoldenState();
    state.activeRaid.status = "kia";
    const context = createEngineContext(state).context;
    const onRaidEnd = vi.fn();
    const module = makeModule({ canExecute: (s: GameState) => s.activeRaid.status === "extracted", onRaidEnd });

    dispatchRaidEndModules(state, makeHook("kia"), context, [module]);

    expect(onRaidEnd).not.toHaveBeenCalled();
  });

  it('invokes onRaidEnd once with the state, hook, and context when the gate passes', () => {
    const state = makeGoldenState();
    state.activeRaid.status = "extracted";
    const context = createEngineContext(state).context;
    const hook = makeHook("extracted");
    const onRaidEnd = vi.fn();
    const module = makeModule({ onRaidEnd });

    dispatchRaidEndModules(state, hook, context, [module]);

    expect(onRaidEnd).toHaveBeenCalledTimes(1);
    expect(onRaidEnd).toHaveBeenCalledWith(state, hook, context);
  });

  it('lands a STASH_ADD intent emitted by a module into the state stash', () => {
    const state = makeGoldenState();
    expect(state.stash.items).toEqual([]);
    const engine = createEngineContext(state);
    const module = makeModule({
      onRaidEnd: (_state: GameState, _hook: InterruptHook, context: EngineContext) => {
        context.emitIntent({ targetEntityId: "stash", type: "STASH_ADD", value: { itemId: "ai2", quantity: 2 } });
      },
    });

    dispatchRaidEndModules(state, makeHook("extracted"), engine.context, [module]);

    expect(state.stash.items).toHaveLength(1);
    expect(state.stash.items[0].item.id).toBe("ai2");
    expect(state.stash.items[0].quantity).toBe(2);
  });
});

describe('scavengerWorkstationModule gate', () => {
  it('rejects while the module is unbuilt (level 0)', () => {
    const state = makeGoldenState();
    state.activeRaid.status = "extracted";
    expect(scavengerWorkstationModule.canExecute(state)).toBe(false);
  });

  it('requires an extraction (KIA raids produce nothing)', () => {
    const state = makeGoldenState();
    levelUp(state, 1);
    state.activeRaid.status = "kia";
    expect(scavengerWorkstationModule.canExecute(state)).toBe(false);
  });

  it('passes on extraction with a built module and no prior production', () => {
    const state = makeGoldenState();
    levelUp(state, 1);
    state.activeRaid.status = "extracted";
    state.pmc.raidsCount = 1;
    expect(scavengerWorkstationModule.canExecute(state)).toBe(true);
  });

  it('respects the raid-count cooldown', () => {
    const state = makeGoldenState();
    levelUp(state, 1);
    state.activeRaid.status = "extracted";
    state.pmc.raidsCount = 1;
    state.hideout.scavengerWorkstation.lastProducedAtRaidIndex = 1;
    expect(scavengerWorkstationModule.canExecute(state)).toBe(false);

    state.pmc.raidsCount = 3;
    expect(scavengerWorkstationModule.canExecute(state)).toBe(true);
  });
});

describe('scavengerWorkstationModule onRaidEnd', () => {
  it('emits a Perception/map-scaled STASH_ADD reward and records the production raid', () => {
    const state = makeGoldenState();
    levelUp(state, 1);
    state.activeRaid.status = "extracted";
    state.pmc.raidsCount = 1;
    const engine = createEngineContext(state);

    dispatchRaidEndModules(state, makeHook("extracted"), engine.context, [scavengerWorkstationModule]);

    const expected = computeScavengerWorkstationQuantity(
      2,
      state.pmc.skills.perception.level,
      state.activeRaid.map!.lootMultiplier,
    );
    expect(state.stash.items.find(e => e.item.id === "bolts")?.quantity).toBe(expected);
    expect(state.hideout.scavengerWorkstation.lastProducedAtRaidIndex).toBe(1);
  });

  it('emits nothing while the cooldown has not elapsed', () => {
    const state = makeGoldenState();
    levelUp(state, 1);
    state.activeRaid.status = "extracted";
    state.pmc.raidsCount = 2;
    state.hideout.scavengerWorkstation.lastProducedAtRaidIndex = 1;
    const engine = createEngineContext(state);

    dispatchRaidEndModules(state, makeHook("extracted"), engine.context, [scavengerWorkstationModule]);

    expect(state.stash.items).toEqual([]);
    expect(state.hideout.scavengerWorkstation.lastProducedAtRaidIndex).toBe(1);
  });

  it('produces higher-tier rewards at higher module levels', () => {
    const state = makeGoldenState();
    levelUp(state, 3);
    state.activeRaid.status = "extracted";
    state.pmc.raidsCount = 1;
    const engine = createEngineContext(state);

    dispatchRaidEndModules(state, makeHook("extracted"), engine.context, [scavengerWorkstationModule]);

    expect(state.stash.items.find(e => e.item.id === "cpu")).toBeDefined();
  });
});

describe('scavengerWorkstationModule end-to-end through runRaidTick', () => {
  it('rewards the extraction run and stays idle on dehydration KIA', () => {
    const spy = installSeed(4);
    try {
      let state = makeGoldenState();
      levelUp(state, 1);
      let ticks = 0;
      while (ticks < 300) {
        const next = runRaidTick(state);
        state = next;
        ticks++;
        if (!state.activeRaid.isActive) break;
      }

      expect(state.activeRaid.status).toBe("extracted");
      const reward = SCAVENGER_WORKSTATION_REWARD_BY_LEVEL[1];
      expect(state.stash.items.find(e => e.item.id === reward.itemId)?.quantity).toBeGreaterThanOrEqual(reward.baseQuantity);
      expect(state.hideout.scavengerWorkstation.lastProducedAtRaidIndex).toBe(state.pmc.raidsCount);
    } finally {
      spy.mockRestore();
    }
  });

  it('does not produce on a KIA run (status gate blocks the dispatch)', () => {
    const spy = installSeed(7);
    try {
      const state = makeGoldenState();
      levelUp(state, 1);
      state.pmc.hydration = 0;
      const next = runRaidTick(state);

      expect(next.activeRaid.status).toBe("kia");
      expect(next.hideout.scavengerWorkstation.lastProducedAtRaidIndex).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});
