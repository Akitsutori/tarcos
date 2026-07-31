import { GameState, PMCCharacter, EnemyState } from "../types";
import { ALL_ITEMS } from "../data";
import {
  AppliedPatch,
  EngineContext,
  EnvironmentQuery,
  EnvironmentResult,
  IntentPayload,
  TickPhase,
  TickTelemetry,
} from "./types";

/**
 * Resolves a target entity id to the live object inside the tick's GameState.
 * The context owns the working copy of state, so entities resolved here are
 * the SAME references the orchestrator and combat views operate on.
 */
const resolveEntity = (state: GameState, entityId: string): PMCCharacter | EnemyState => {
  if (entityId === "pmc") return state.pmc;
  if (entityId === "enemy") {
    if (!state.activeRaid.combatTarget) {
      throw new Error(`[engineContext] Cannot resolve entity "enemy": no active combatTarget.`);
    }
    return state.activeRaid.combatTarget;
  }
  throw new Error(`[engineContext] Unknown target entity id: "${entityId}".`);
};

/**
 * Pure intent reducer: applies a single intent to the tick's state and
 * returns the patches it generated.
 *
 * Phase 2 applies intents synchronously (the state is mutated in place) so
 * downstream reads observe the same intermediate state as before the
 * migration; the emitted-intent queue and settle() provide the telemetry /
 * settlement surface that Phase 3 (AsyncGenerator migration) will convert to
 * deferred, structurally-immutable settlement.
 */
export const applyIntent = (state: GameState, intent: IntentPayload): AppliedPatch[] => {
  switch (intent.type) {
    case "DAMAGE": {
      const target = resolveEntity(state, intent.targetEntityId);
      const part = target.bodyParts[intent.value.bodyPart];
      const before = part.current;
      part.current = Math.max(0, part.current - intent.value.amount);
      return [{ entity: intent.targetEntityId, field: `bodyParts.${intent.value.bodyPart}`, before, after: part.current }];
    }
    case "STATUS_EFFECT": {
      const target = resolveEntity(state, intent.targetEntityId);
      if (intent.value === "BLEED_START") {
        const before = target.isBleeding;
        target.isBleeding = true;
        return [{ entity: intent.targetEntityId, field: "isBleeding", before, after: true }];
      }
      return [];
    }
    case "POSITION_CHANGE": {
      const raid = state.activeRaid;
      const before = raid.currentStage;
      raid.currentStage = intent.value.to;
      return [{ entity: "raid", field: "currentStage", before, after: raid.currentStage }];
    }
    case "XP": {
      const pmc = state.pmc;
      const before = pmc.xp;
      pmc.xp += intent.value;
      return [{ entity: "pmc", field: "xp", before, after: pmc.xp }];
    }
    case "STASH_ADD": {
      const { itemId, quantity } = intent.value;
      const stashEntry = state.stash.items.find(entry => entry.item.id === itemId);
      if (stashEntry) {
        const before = stashEntry.quantity;
        stashEntry.quantity += quantity;
        return [{ entity: "stash", field: `items.${itemId}`, before, after: stashEntry.quantity }];
      }
      const template = ALL_ITEMS[itemId];
      if (!template) {
        throw new Error(`[engineContext] STASH_ADD: unknown item id "${itemId}".`);
      }
      state.stash.items.push({ item: { ...template }, quantity });
      return [{ entity: "stash", field: `items.${itemId}`, before: 0, after: quantity }];
    }
  }
};

export interface EngineContextHandle {
  readonly context: EngineContext;
  readonly pendingIntents: readonly IntentPayload[];
  readonly hasPendingIntents: boolean;
  setPhase(phase: TickPhase): void;
  settle(): TickTelemetry;
}

/**
 * Creates the per-tick EngineContext adapter wrapping the tick's working
 * GameState copy. Intents emitted via `context.emitIntent` are applied through
 * the reducer and recorded for settlement/telemetry; `queryEnvironment`
 * exposes read-only validation queries.
 */
export const createEngineContext = (
  state: GameState,
  options: { tick?: number; phase?: TickPhase; sourceEntityId?: string } = {}
): EngineContextHandle => {
  const tick = options.tick ?? 0;
  const sourceEntityId = options.sourceEntityId ?? "runRaidTick";
  let phase: TickPhase = options.phase ?? "NUTRITION_DECAY";

  const emittedIntents: IntentPayload[] = [];
  const appliedPatches: AppliedPatch[] = [];

  const context: EngineContext = {
    get currentTick() {
      return tick;
    },
    emitIntent(intent) {
      emittedIntents.push(intent);
      appliedPatches.push(...applyIntent(state, intent));
    },
    queryEnvironment(query: EnvironmentQuery): EnvironmentResult {
      switch (query.kind) {
        case "bodyPartHp": {
          const target = resolveEntity(state, query.entity);
          return target.bodyParts[query.part].current;
        }
        case "weaponAmmo": {
          if (query.entity === "pmc") {
            const weapon = state.stash.weapons.find(w => w.id === state.stash.equippedWeaponId) || state.stash.weapons[0];
            return weapon ? weapon.currentMagRounds : null;
          }
          const enemy = resolveEntity(state, "enemy") as EnemyState;
          return enemy.equippedWeapon.currentMagRounds;
        }
        case "armorDurability": {
          const target = resolveEntity(state, query.entity);
          const armor = target.equippedArmor;
          return armor && armor.durability !== undefined ? armor.durability : null;
        }
        case "raidStatus":
          return state.activeRaid.status;
        case "hydration":
          return state.pmc.hydration;
        case "isBleeding": {
          const target = resolveEntity(state, query.entity);
          return target.isBleeding;
        }
      }
    },
  };

  const settle = (): TickTelemetry => {
    const telemetry: TickTelemetry = {
      tick,
      phase,
      sourceEntityId,
      emittedIntents: [...emittedIntents],
      appliedPatches: [...appliedPatches],
      yieldedHooks: [],
    };
    emittedIntents.length = 0;
    appliedPatches.length = 0;
    return telemetry;
  };

  return {
    context,
    get pendingIntents() {
      return emittedIntents;
    },
    get hasPendingIntents() {
      return emittedIntents.length > 0;
    },
    setPhase(next: TickPhase) {
      phase = next;
    },
    settle,
  };
};
