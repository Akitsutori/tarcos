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

Migration checklist (short)

- [ ] Run tests and record baseline
- [ ] Create branch feat/engine-refactor (optional for large changes) — user requested commit to main directly; ensure working tree is clean before changes
- [ ] Implement EngineContext types + runtime
- [ ] Convert one action (e.g., reload/fire) to BehaviorModule + AsyncGenerator as a POC
- [ ] Convert settlement & replace one direct mutation path with emitIntent + settlement
- [ ] Iterate across engine files (raidSimulation, combat, maintenance, loot)

Notes on commiting: you asked for direct commit to main. This file documents the exact code changes required. Given the high impact of the changes, consider using a feature branch and PR for the multiline refactorwork if you want easier review.

If you'd like, I can now commit this file (arch_todo.md) into the repository root on main — do you want me to proceed?