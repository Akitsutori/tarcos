import { PMCBodyParts } from "../types";

/**
 * A single, atomic, observable state change emitted during a raid tick.
 * Intents are the unit of the Intent Settlement Queue: each one describes
 * WHAT changed, leaving WHERE/HOW to the settlement reducer.
 *
 * Note: `value: { to: string }` in the original blueprint is represented
 * here as `{ to: number }` because the current POSITION_CHANGE domain value
 * is the tile stage index (raid.currentStage), not a named map position.
 */
export type IntentPayload =
  | { targetEntityId: string; type: "DAMAGE"; value: { bodyPart: keyof PMCBodyParts; amount: number } }
  | { targetEntityId: string; type: "STATUS_EFFECT"; value: "BLEED_START" | "HEAL" }
  | { targetEntityId: string; type: "POSITION_CHANGE"; value: { to: number } }
  | { targetEntityId: string; type: "XP"; value: number }
  | { targetEntityId: string; type: "STASH_ADD"; value: { itemId: string; quantity: number } };

/**
 * Future-proof death causes. The current engine only reaches the KIA
 * pipeline via `"dehydration" | "combat"` (see handleKIA); the remaining
 * causes are reserved for planned death paths (bleed-out, toxicity, etc.).
 */
export type KIAReason =
  | "COMBAT_BALLISTICS"
  | "DEHYDRATION"
  | "STARVATION"
  | "BLEED_OUT"
  | "OVERDOSE_TOXICITY"
  | "ENVIRONMENTAL_HAZARD"
  | "MIA_TIMEOUT";

export type EnvironmentQuery =
  | { kind: "bodyPartHp"; entity: "pmc" | "enemy"; part: keyof PMCBodyParts }
  | { kind: "weaponAmmo"; entity: "pmc" | "enemy" }
  | { kind: "armorDurability"; entity: "pmc" | "enemy" }
  | { kind: "raidStatus" }
  | { kind: "hydration"; entity: "pmc" }
  | { kind: "isBleeding"; entity: "pmc" | "enemy" };

export type EnvironmentResult = number | string | boolean | null;

/**
 * Read-only, observable view of the engine for intent emission and
 * validation queries. Implemented by the runtime adapter in engineContext.ts.
 */
export interface EngineContext {
  readonly currentTick: number;
  emitIntent(intent: IntentPayload): void;
  queryEnvironment(query: EnvironmentQuery): EnvironmentResult;
}

export interface InterruptHook {
  readonly sourceEntityId: string;
  readonly hookType: "BEFORE_ACTION" | "AFTER_DAMAGE" | "BEFORE_LEAVE_COVER" | "AFTER_RAID_END";
  readonly metadata: Record<string, unknown>;
}

export type TickPhase = "COMBAT" | "LOOT" | "MAINTENANCE" | "NUTRITION_DECAY";

export interface AppliedPatch {
  readonly entity: string;
  readonly field: string;
  readonly before: number | string | boolean;
  readonly after: number | string | boolean;
}

export interface TickTelemetry {
  readonly tick: number;
  readonly phase: TickPhase;
  readonly sourceEntityId: string;
  readonly emittedIntents: IntentPayload[];
  readonly appliedPatches: AppliedPatch[];
  readonly yieldedHooks: InterruptHook[];
}

export type InterceptorDirective =
  | { type: "CONTINUE" }
  | { type: "INJECT_INTENT"; intent: IntentPayload }
  | { type: "CANCEL_ACTION"; reason: string };

/**
 * Strategy contract for PMC class passives and hideout modules.
 * `execute` yields interception points so external agents/UI can observe
 * or redirect an action mid-flight (Phase 4 target).
 */
export interface BehaviorModule<TActor = any, TTarget = any> {
  readonly id: string;
  canExecute(actor: TActor, target: TTarget, context: EngineContext): boolean;
  canInterrupt(actor: TActor, hook: InterruptHook, context: EngineContext): boolean;
  execute(actor: TActor, target: TTarget, context: EngineContext): AsyncGenerator<InterruptHook, void, unknown>;
}
