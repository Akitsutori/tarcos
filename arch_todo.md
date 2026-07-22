# Architecture TODO: Engine Audit & Refactor Plan

Objective

Audit findings and an actionable refactor plan to migrate the engine towards an event-driven, decoupled Order-Matching Pipeline (Command/Interceptor Pattern with Async Generators). The plan focuses on strictly enforcing Inversion of Control, converting direct mutations into EngineContext Intent settlement, and enabling interruptible execution via AsyncGenerator-based pipelines.

Executive summary

The codebase contains several concentrated violations of the target architecture:
- Engine loops contain domain-specific conditionals and duplicated logic (raidSimulation.ts, combat.ts).
- Game logic performs direct state mutations inside action functions (e.g., pmc.xp += earnedXp; defender.bodyParts.head.current = 1). These must become emitted IntentPayloads settled by an EngineContext.
- Multi-stage actions are implemented as monolithic, synchronous loops without yieldable hooks, preventing cooperative interrupts and correct cancellation.
- Many hardcoded balance numbers, ballistics, and passive-class checks are embedded in engine code rather than in tuning/config assets.

This file organizes the work into High / Medium / Low priorities. Each task lists affected files, the architecture principle violated, and a concrete fix with implementation notes.

High Priority / Breaking

1) Core engine: Introduce EngineContext and convert main execution loop(s) to an interruptible AsyncGenerator pipeline

Files affected:
- src/engine/raidSimulation.ts
- src/engine/combat.ts
- src/gameEngine.ts (barrel re-export)
- (New) src/engine/engineContext.ts

Violated principles:
- Strict Inversion of Control (host contains domain checks & executes behavior inline)
- Interruptible Execution (monolithic loops, no yield hooks)
- Intent vs. Mutation (direct mutation of entities inside engine flow)

Proposed fix:
- Create EngineContext type (see Target Interface Baseline). Implement a runtime EngineContext class/adapter in src/engine/engineContext.ts that exposes:
  - readonly currentTick: number
  - emitIntent(intent: IntentPayload): void
  - queryEnvironment(query: EnvironmentQuery): EnvironmentResult
  - a settlement step that accumulates Intents and applies them atomically between yields
- Convert primary engine ticks (raidSimulation.runRaidTick, combat resolution loop) into AsyncGenerator flows that yield InterruptHook objects at well-defined interception points (e.g. BEFORE_ACTION, AFTER_DAMAGE, BEFORE_LEAVE_COVER). Example signature:
  - execute(actor, target, context): AsyncGenerator<InterruptHook, void, unknown>
- Replace direct mutations inside these flows with context.emitIntent({ type: 'DAMAGE' | 'STATUS_EFFECT' | 'POSITION_CHANGE', targetEntityId, value }). Settlement will be performed only by EngineContext at a deterministic stabilization point (between yielded steps).
- Add enforcement: the engine host should not read/write domain fields directly while the action is executing; only settlement step updates entity state.

Implementation notes / steps:
- Add src/engine/engineContext.ts with the EngineContext implementation and types (IntentPayload, InterruptHook).
- Refactor raidSimulation.runRaidTick to call async generator-based action flows and await/iterate them, checking state guards between yields to cancel as necessary.
- Add a central settlement function that receives a list of emitted intents and produces state mutation patch objects; apply patches atomically.
- Unit tests: add tests that verify emitted intents are applied only at settle points and that cancellation due to state guard occurs between yields.

Estimated effort: 6–10 hours. This is breaking because it changes execution control flow.

Medium Priority

2) Extract behavior modules and strategy interfaces (BehaviorModule)

Files affected:
- src/engine/combat.ts
- src/engine/raidSimulation.ts
- src/engine/maintenance.ts
- src/engine/spawning.ts
- src/engine/combatActions.ts (new)
- src/engine/behaviors/ (new folder)

Violated principles:
- Inversion of Control (engine contains class-based/domain logic)

Proposed fix:
- Define BehaviorModule<TActor,TTarget> interface and create small Behavior implementations for units of logic (class passives, reload behavior, movement behavior).
- Move class passive logic (SURVIVOR free reload, SCOUT burst/dodge, SOLDIER damage modifiers, LUCKY survival) into behavior modules under src/engine/behaviors/. Each module implements canExecute, canInterrupt, execute as AsyncGenerator.
- The engine host will only coordinate BehaviorModule lookup and invocation for an actor; the behavior modules emit Intents via EngineContext.

Implementation notes:
- Create src/engine/behaviors/index.ts exporting discovered behaviors.
- Introduce a registration mechanism (actor.behaviors: BehaviorModule[]) loaded at spawn time from spawn profiles.
- Update combat loop to query actor.behaviors for canExecute and to run behavior.execute(...) as a generator stream.

3) Convert direct state mutations in combat and maintenance to Intent emission

Files affected:
- src/engine/combat.ts (multiple spots — see TODO_ARCH.md bullets)
- src/engine/maintenance.ts

Violated principles:
- Broker & Settlement Pattern (modules mutate state directly)

Proposed fix:
- Replace lines that do direct mutations (e.g., defender.isBleeding = true; defender.bodyParts.head.current = 1; pmc.xp += earnedXp; pmc.level++) with context.emitIntent() calls, for example:
  - context.emitIntent({ targetEntityId: defender.id, type: 'STATUS_EFFECT', value: 'BLEED_START' })
  - context.emitIntent({ targetEntityId: pmc.id, type: 'POSITION_CHANGE', value: { to: 'extracted' } })
- Implement a small Intent schema and a deterministic settlement function to map intents to concrete, atomic mutations and logs.

Low / Medium: Data-driven tuning & duplication removal

4) Move tuning & balance into data/tuning and split data.ts

Files affected:
- src/data.ts → split into src/data/content/* and src/data/tuning/*
- src/engine/spawning.ts
- src/engine/loot.ts

Violated principles:
- Clean domain naming / Single Responsibility (content mixed with tuning)

Proposed fix:
- Create data/content/items.ts, maps.ts, weapons.ts
- Create data/tuning/combatBalance.ts, enemySpawning.ts, raidConfig.ts, medicalConfig.ts, lootConfig.ts
- Replace hardcoded magic numbers across engine with imports from these tuning files; keep the engine logic pure and driven by config objects.

5) Consolidate duplicated algorithms (loot sorting, KIA handling)

Files affected:
- src/engine/raidSimulation.ts
- src/engine/loot.ts
- src/engine/maintenance.ts

Violated principles:
- Duplication (code reuse / single source of truth)

Proposed fix:
- Move sorting/partitioning logic into src/engine/lootManagement.ts (export sortLootIntoContainers, SECURE_CONTAINER_CAPACITY)
- Extract KIA resolution into src/engine/raidResolution.ts with handleKIA(state, reason) and handleExtraction(state)
- Replace duplicate code in raidSimulation.ts, loot.ts, and maintenance.ts with calls to the new modules.

Low Priority / Polish

6) Type alignment, tests and small ergonomics

Files affected:
- src/types.ts
- tests/
- vitest config

Tasks:
- Add EngineContext, IntentPayload, InterruptHook, BehaviorModule interfaces to src/types.ts (or a dedicated src/engine/types.ts) and align code.
- Add unit tests for:
  - BehaviorModules that assert they emit the expected intents instead of mutating state
  - EngineContext settlement behavior (intents applied atomically between yields)
  - Interrupt handling: actions that yield InterruptHook and get cancelled when state guard resolves
- Add lint/type checks to CI (if not present) and ensure all new modules are covered by tests.

Concrete examples & line pointers (from existing analysis)

- raidSimulation.ts (lines referenced in TODO_ARCH.md): duplicated KIA handling (3x repeated ~lines 55–103 & 111–158). Move to raidResolution.handleKIA.
- combat.ts (lines referenced in TODO_ARCH.md): class passives scattered (lines ~141–280). Move passive triggers to BehaviorModules and passive config to data/tuning/combatBalance.ts.
- spawning.ts (lines referenced in TODO_ARCH.md): tier ranges duplicated — move to data/tuning/enemySpawning.ts.
- loot.ts & raidSimulation.ts: identical secure container sorting (extract sortLootIntoContainers to src/engine/lootManagement.ts).
- maintenance.ts: 3 duplicated backup search predicates — centralize predicates in medicalConfig and implement findBackupMedical helper.

Proposed Target Interfaces (copy into src/engine/types.ts)

```typescript
export interface EngineContext {
  readonly currentTick: number;
  emitIntent(intent: IntentPayload): void;
  queryEnvironment(query: any): any;
}

export interface InterruptHook {
  readonly sourceEntityId: string;
  readonly hookType: string; // e.g., 'BEFORE_LEAVE_COVER'
  readonly metadata: Record<string, unknown>;
}

export interface IntentPayload {
  readonly targetEntityId: string;
  readonly type: 'DAMAGE' | 'STATUS_EFFECT' | 'POSITION_CHANGE' | 'XP';
  readonly value: number | string | Record<string, unknown>;
}

export interface BehaviorModule<TActor = any, TTarget = any> {
  readonly id: string;
  canExecute(actor: TActor, target: TTarget, context: EngineContext): boolean;
  canInterrupt(actor: TActor, hook: InterruptHook, context: EngineContext): boolean;
  execute(actor: TActor, target: TTarget, context: EngineContext): AsyncGenerator<InterruptHook, void, unknown>;
}
```

Hideout Modules & Extensibility — Example of benefits

Overview

The Event‑Driven / EngineContext architecture maps cleanly to extensible hideout modules. Treat each hideout module as a small, stateful plugin that computes Intents and registers for Engine events (AFTER_RAID_END, ON_HIDEOUT_TICK, PLAYER_INTERACT, etc.). This decouples module logic from engine internals, makes behavior composable, and enables features like automatic stash generation, stat modifiers, and interactive minigames with cooldowns.

How it fits

- Modules are plain data-driven instances stored in the player's hideout state and loaded as BehaviorModule‑like plugins at runtime.
- Modules compute Intents rather than mutating game state directly. The EngineContext settles those Intents atomically.
- Interactive modules (minigames) are implemented as AsyncGenerator flows that yield progress hooks for the UI and emit reward Intents on completion.

Key components & API extensions

- ModuleInstance (persisted in hideout state):
  - id: string
  - type: string
  - level: number
  - state: Record<string, unknown>
  - cooldownUntil?: number (tick)

- EngineContext additions (helpers used by modules):
  - getModuleState(moduleId: string): unknown
  - setModuleState(moduleId: string, state: unknown): void
  - scheduleAt(tick: number, callbackId: string, payload?: unknown): void

Suggested Intent types (examples)

- STASH_ADD { itemId, quantity }
- PLAYER_STAT_MOD { stat, delta, permanent?: boolean, durationTicks?: number }
- MODULE_STATE_SET { moduleId, state }
- MODULE_COOLDOWN_SET { moduleId, untilTick }
- MINIGAME_REWARD { rewardIntents: IntentPayload[] } (engine flattens these into the settlement queue)

Events / Hooks (InterruptHook names)

- AFTER_RAID_END — good for auto‑stash generation
- ON_HIDEOUT_TICK — periodic module processing
- PLAYER_START_MINIGAME — triggers interactive module execute
- MINIGAME_STEP / MINIGAME_RESULT — yielded by minigame generators to report progress/results

Example flows

A) Auto‑generate stash items after each raid (Scavenger module)
1. Engine emits AFTER_RAID_END with raid summary.
2. Scavenger module (module.execute or an event handler) checks cooldown/state, rolls loot using its level & tuning, and calls context.emitIntent({ type: 'STASH_ADD', targetEntityId: playerId, value: { itemId, quantity } }).
3. Module emits MODULE_STATE_SET to persist lastRaidTick or similar.
4. Engine settles intents atomically and updates stash.

B) Modules that modify player stats
- Module emits PLAYER_STAT_MOD (permanent or temporary). For temporary effects, module can schedule a rollback using scheduleAt() which emits a counter‑intent when the duration expires.

C) Minigame awarding permanent stat bonus with cooldown
1. Player triggers the minigame -> engine starts module.execute(...) (AsyncGenerator).
2. Module yields MINIGAME_STEP hooks with progress for UI rendering.
3. On win: module emits MINIGAME_REWARD that contains PLAYER_STAT_MOD (permanent) and possibly STASH_ADD. It also emits MODULE_COOLDOWN_SET to prevent immediate replays.
4. Engine settles intents and persists module cooldown/state.

Persistence, determinism & anti‑abuse

- Module state is persisted in the same save store (localStorage) so bonuses and cooldowns survive reloads.
- Use deterministic RNG seeds for tests/replays; modules should accept an injected RNG for unit tests.
- Enforce caps and tuning limits in settlement logic (e.g., max permanent bonuses) to prevent stacking abuse.

Testability & Debugging

- Unit test modules in isolation using a stubbed EngineContext that records emitted intents.
- Integration tests: run AFTER_RAID_END scenarios with fixed seed and assert stash changes.
- Intent trace logs (see debugging section) make it trivial to locate which module emitted a problematic intent and why.

File layout suggestion

```
src/engine/modules/
  index.ts         # registry
  base.ts          # BaseModule helpers
  scavenger.ts     # auto‑stash example
  trainingRoom.ts  # minigame example
src/data/tuning/modules.ts # module tuning: loot tables, cooldowns, rewards
```

Example interfaces

```typescript
type ModuleInstance = {
  id: string;
  type: string;
  level: number;
  state: Record<string, unknown>;
  cooldownUntil?: number;
};

type IntentPayload =
  | { targetEntityId: string; type: 'STASH_ADD'; value: { itemId: string; quantity: number } }
  | { targetEntityId: string; type: 'PLAYER_STAT_MOD'; value: { stat: string; delta: number; permanent?: boolean; durationTicks?: number } }
  | { type: 'MODULE_STATE_SET'; value: { moduleId: string; state: Record<string, unknown> } }
  | { type: 'MODULE_COOLDOWN_SET'; value: { moduleId: string; untilTick: number } };
```

Design principles & recommendations

- Keep module logic small and focused: modules should compute Intents and minimal module state, not mutate global state.
- Prefer tuning/data changes for numeric adjustments; change code only for logic bugs.
- Limit PR scope: one module or one tuning change per PR when possible.
- Provide rich intent traces and deterministic replays to support quick debugging.

Migration plan (concise)

1. Add module registry + ModuleInstance shape to state.
2. Extend EngineContext with getModuleState/setModuleState and scheduleAt.
3. Implement a simple Scavenger module (auto STASH_ADD after raid) as POC.
4. Add Intent types STASH_ADD & MODULE_STATE_SET and settlement logic.
5. Add tests & trace logging for the POC.
6. Implement trainingRoom minigame module as AsyncGenerator POC with cooldown.


Migration checklist (short)

- [ ] Run tests and record baseline
- [ ] Create branch feat/engine-refactor (optional for large changes) — user requested commit to main directly; ensure working tree is clean before changes
- [ ] Implement EngineContext types + runtime
- [ ] Convert one action (e.g., reload/fire) to BehaviorModule + AsyncGenerator as a POC
- [ ] Convert settlement & replace one direct mutation path with emitIntent + settlement
- [ ] Iterate across engine files (raidSimulation, combat, maintenance, loot)

Notes on commiting: you asked for direct commit to main. This file documents the exact code changes required. Given the high impact of the changes, consider using a feature branch and PR for the ...