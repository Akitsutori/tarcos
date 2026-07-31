import { describe, it, expect, vi } from 'vitest';
import { RAID_END_MODULES, dispatchRaidEndModules } from './hideoutModules';
import { createEngineContext } from '../engineContext';
import { makeGoldenState } from '../characterization/goldenHarness';
import { GameState } from '../../types';
import { EngineContext, InterruptHook, ModuleInstance } from '../types';

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

describe('RAID_END_MODULES registry', () => {
  it('is empty: no game-feature module ships yet (infra seam only)', () => {
    expect(RAID_END_MODULES).toEqual([]);
  });
});

describe('dispatchRaidEndModules', () => {
  it('is a no-op with the empty default registry', () => {
    const state = makeGoldenState();
    const context = createEngineContext(state).context;

    expect(() => dispatchRaidEndModules(state, makeHook("extracted"), context)).not.toThrow();
    expect(state.stash.items).toEqual([]);
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
