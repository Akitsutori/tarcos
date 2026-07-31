# TARCOS Architecture Roadmap: Grounded Agentic Engine & Data-Driven Refactoring

> **Document Purpose**: This document serves as both the technical architectural master plan for `tarkov-zero-player-roguelike` and a **presentation blueprint**. It tells the narrative story of how TARCOS evolved from a monolithic prototype into an autonomous, event-driven agentic game engine, explaining the causal connections between game features and architectural choices.

---

## Act I: The Vision — A Zero-Player Roguelike Driven by Autonomous Simulation

### The Game Concept
TARCOS (**T**actical **A**rmed **R**oguelike **C**ombat **O**bservation **S**imulator) is a zero-player extraction roguelike inspired by *Escape from Tarkov*. Unlike traditional action RPGs where players control movement in real time via keyboard/gamepad, TARCOS runs on **autonomous simulation**:
- Players manage meta-progression, PMC loadouts, stash inventory, and hideout modules.
- Once deployed into a raid, PMC units, enemy scavs, bosses, and environmental hazards interact **autonomously**.
- The engine simulates movement across map tiles, nutrition/hydration decay, ballistics, armor penetration, looting, medical maintenance, and extraction.

### The Architectural Requirement
Because **the game engine *is* the player**, control flow cannot be a static display loop. The architecture must natively support:
1. **Step-by-step Interception**: Yield points where human players, external AI agents, or UI visualizers can observe state, pause simulation, or intercept choices (e.g., deciding whether to push cover or flee).
2. **Deterministic Intent Settlement**: Guaranteed atomic state transitions so that actions can be dry-run, previewed, or cleanly cancelled without corrupting entity state.
3. **Isolated Balance Tuning**: A pure data layer allowing game designers or automated AI balance agents to tweak ammo ballistics, spawn weights, and class passives without touching core simulation code.

---

## Act II: The Evolution — How Rapid Prototyping Created Structural Friction

### Phase 1: The Rapid Prototype
To get TARCOS playable quickly, mechanics were implemented imperatively inside centralized engine functions. Early code directly mutated global state objects:
- `raidSimulation.ts` handled time, nutrition decay, combat triggers, looting, quest finalization, level-up loops, and extraction in a single function (`runRaidTick`).
- `combat.ts` handled initiative, action selection, reload math, cover, burst calculations, armor penetration, bleed chances, and death inline.

### Phase 2: Feature Growth & The Tipping Point
As features multiplied (5 PMC classes, 3 enemy tiers, 100+ items, hideout workstations, medical maintenance), code expanded into monoliths:
- `raidSimulation.ts` (336 lines)
- `combat.ts` (309 lines)
- `spawning.ts` (161 lines)
- `maintenance.ts` (164 lines)
- `loot.ts` (115 lines)
- `data.ts` (560 lines)

### Phase 3: The Four Concrete Code Pains

#### Pain 1: The Intelligence Center Bug (Code Duplication Divergence)
* **Location**: [loot.ts:L76](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/loot.ts#L76) vs [raidSimulation.ts:L186](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/raidSimulation.ts#L186)
* **The Code Pain**: `loot.ts:L76` hardcodes `const secureCap = 4` (ignoring `hideout.intelligenceCenter.level`), while `raidSimulation.ts` calculates `secureCap` dynamically as 4, 6, or 9 based on hideout level. Both files repeat 25 lines of identical value-sorting loot distribution logic ([loot.ts:L79-101](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/loot.ts#L79-L101)).
* **Causal Link**: When Intelligence Center stash upgrades were added to `raidSimulation.ts`, `loot.ts` was missed, causing in-raid scavenging to silently cap secure containers at 4 slots regardless of hideout upgrades.

#### Pain 2: Duplicated KIA State Processing
* **Location**: [raidSimulation.ts:L55-103](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/raidSimulation.ts#L55-L103) & [L111-158](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/raidSimulation.ts#L111-L158)
* **The Code Pain**: A 48-line block handling player death (stash item saving, level-up loops, skill XP rewards, quest finalization, survival rate calculation) is repeated verbatim in two places: Dehydration KIA (L55) and Combat KIA (L111).
* **Causal Link**: Any update to death mechanics (e.g. insured item recovery or death penalties) required updating both blocks. Missing one block caused dehydration and combat deaths to diverge in game behavior.

#### Pain 3: Scattered PMC Class Passives
* **Location**: [combat.ts:L141, L177, L200, L240, L277](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/combat.ts#L141)
* **The Code Pain**: PMC class passives are hardcoded across 5 separate conditionals in core combat code:
  - `combat.ts:L141`: `SURVIVOR` class reload forces `actionChosen = "fire"`.
  - `combat.ts:L177`: `SCOUT` class alters SMG burst ranges (3–7 vs 1–5).
  - `combat.ts:L200`: `SCOUT` class applies 2.0x dodge multipliers.
  - `combat.ts:L240`: `SOLDIER` class applies +20% damage dealing / -15% damage taking.
  - `combat.ts:L277`: `LUCKY` class prevents fatal damage 15% of the time.
* **Causal Link**: Adding a new PMC class (e.g., `MARKSMAN` or `MEDIC`) required editing 5 different places inside a 309-line nested combat loop.

#### Pain 4: Full State Deep-Cloning & Lock-in Synchronous Loops
* **Location**: [raidSimulation.ts:L20](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/raidSimulation.ts#L20)
* **The Code Pain**: `runRaidTick()` executes `const newState = JSON.parse(JSON.stringify(state))` on **every single tick** out of mutation anxiety (`pmc.energy -= 1`, `curWep.currentMagRounds--`). Combat rounds run synchronously to completion without yield points.
* **Causal Link**: Deep-cloning global state every tick creates heavy CPU/GC overhead. Synchronous loops prevent UI debuggers or external AI agents from stepping through combat rounds turn-by-turn.

---

## Act III: The Crisis — Human & AI-Agent Development Friction

```
                     ┌──────────────────────────────────────────────┐
                     │          HUMAN DEVELOPER FRICTION            │
                     │  • High cognitive load when rebalancing      │
                     │  • Fragile edits in 350+ line monoliths     │
                     │  • Fear of breaking combat control flow     │
                     └──────────────────────┬───────────────────────┘
                                            │
   MONOLITHIC IMPERATIVE                    │          TARGET AGENTIC ARCHITECTURE
   ENGINE INFRASTRUCTURE ───────────────────┼────────────────────────────────────────►
   (Current TARCOS State)                   │          • Isolated Data Tuning Layer
                                            │          • Async Generator Interceptors
                                            │          • Intent Settlement Queue
                     ┌──────────────────────┴───────────────────────┐
                     │            AI AGENTIC CODING FRICTION        │
                     │  • Context window bloat (350+ line files)    │
                     │  • Hallucination risk on duplicated logic    │
                     │  • Cannot intercept synchronous loops        │
                     └──────────────────────────────────────────────┘
```

### 1. Human Developer Friction
- **Rebalancing Overhead**: Changing ammo penetration or Scout dodge multipliers requires editing TypeScript source code in `combat.ts` and re-running full test suites.
- **High Regression Risk**: Modifying combat or looting logic often introduces side-effect bugs in unrelated sub-systems due to direct state mutations.

### 2. AI Coding Agent Friction (Pair Programming & Autonomous Tuning)
- **Context Window Bloat**: AI agents (like Gemini, Claude, or Copilot) must ingest entire 350+ line files to perform minor edits, wasting tokens and increasing latency.
- **Hallucination & Partial Edit Risks**: When logic is duplicated (e.g. KIA processing or container sorting), AI agents routinely update one instance and miss the other, creating subtle runtime bugs.
- **Step Lock-in**: Synchronous `while` loops prevent AI agents or bot algorithms from inspecting state mid-round or injecting tactical decisions.

---

## Act IV: The Solution — The Dual-Pillar Target Architecture

To solve both human and AI development friction, TARCOS is migrating to a **Dual-Pillar Target Architecture**.

```
                           ┌─────────────────────────────────────────┐
                           │      DUAL-PILLAR TARGET ARCHITECTURE    │
                           └────────────────────┬────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
    ┌──────────────────────────────────┐                  ┌──────────────────────────────────┐
    │  PILLAR A: DATA-DRIVEN SUBSTRATE │                  │  PILLAR B: AGENTIC INTENT ENGINE │
    ├──────────────────────────────────┤                  ├──────────────────────────────────┤
    │ • Split data.ts (content/tuning) │                  │ • EngineContext Inversion        │
    │ • Centralize Loot Management     │                  │ • Intent Settlement Queue        │
    │ • Centralize KIA Resolution      │                  │ • AsyncGenerator Interceptors    │
    │ • Pure Config Balancing          │                  │ • BehaviorModule Strategy Spec   │
    └──────────────────────────────────┘                  └──────────────────────────────────┘
```

### Pillar A: Grounded Data-Driven Substrate

#### 1. Split `data.ts` into Content vs. Tuning
- `src/data/content/`: Items (`items.ts`), Maps (`maps.ts`), Quests (`quests.ts`), Weapons (`weapons.ts`), Hideout (`hideout.ts`).
- `src/data/tuning/`: `raidConfig.ts` (decay rates, status thresholds), `combatBalance.ts` (ballistics, class passives, armor), `enemySpawning.ts` (tier profiles), `medicalConfig.ts` (heal costs, search predicates), `lootConfig.ts` (rarity weights).

#### 2. Deduplicate Algorithms into Single Sources of Truth
- **`src/engine/lootManagement.ts`**: Exports `sortLootIntoContainers(allLoot, secureCap)` and `SECURE_CONTAINER_CAPACITY(hideoutLevel)`. Used identically by `loot.ts` and `raidSimulation.ts`.
- **`src/engine/raidResolution.ts`**: Exports `handleKIA(state: GameState, reason: KIAReason, metadata?: Record<string, unknown>): GameState` and `handleExtraction(state)`. Removes 48 lines of duplicated code in `raidSimulation.ts`.
  
  The `KIAReason` enum is designed to be future-proof across all present and planned death paths:
  ```typescript
  export type KIAReason =
    | 'COMBAT_BALLISTICS'     // Fatal damage from enemy bullet or melee hit
    | 'DEHYDRATION'          // Hydration depleted to 0 causing fatal collapse
    | 'STARVATION'           // Energy depleted to 0 causing fatal collapse
    | 'BLEED_OUT'            // Uncontrolled arterial bleed depleted head/thorax HP
    | 'OVERDOSE_TOXICITY'    // Medical item overdose, toxicity, or side-effect threshold
    | 'ENVIRONMENTAL_HAZARD' // Landmines, radiation, or environmental hazard
    | 'MIA_TIMEOUT';         // Raid timer expired before reaching extraction
  ```
  *Why this solves future duplication*: Whenever a new death cause is added (e.g. arterial bleed-out or medical toxicity), developers simply pass the appropriate `KIAReason` to `handleKIA()`. The underlying stash recovery, quest finalization, skill XP awards, level-up loops, and survival statistics run through a single, central pipeline.
- **`src/engine/medicalConfig.ts`**: Centralizes backup item search predicates (`findBackupMedical`) and cost constants.

---

### Pillar B: Agentic Interceptor & Intent Pipeline

#### 1. Inversion of Control via `EngineContext`
Direct mutations (`pmc.xp += earnedXp`, `defender.bodyParts.head.current = 1`) are replaced by intent emission via `EngineContext`. State changes are accumulated and applied **atomically** at deterministic settlement points between tick yields.

#### 2. Target TypeScript Interfaces ([src/engine/types.ts](file:///d:/DOWNLOADS/VSCode/tarkov-zero-player-roguelike/src/engine/types.ts))

```typescript
export type KIAReason =
  | 'COMBAT_BALLISTICS'     // Fatal damage from enemy bullet or melee hit
  | 'DEHYDRATION'          // Hydration depleted to 0 causing fatal collapse
  | 'STARVATION'           // Energy depleted to 0 causing fatal collapse
  | 'BLEED_OUT'            // Uncontrolled arterial bleed depleted head/thorax HP
  | 'OVERDOSE_TOXICITY'    // Medical item overdose, toxicity, or side-effect threshold
  | 'ENVIRONMENTAL_HAZARD' // Landmines, radiation, or environmental hazard
  | 'MIA_TIMEOUT';         // Raid timer expired before reaching extraction

export interface EngineContext {
  readonly currentTick: number;
  emitIntent(intent: IntentPayload): void;
  queryEnvironment(query: EnvironmentQuery): EnvironmentResult;
}

export interface InterruptHook {
  readonly sourceEntityId: string;
  readonly hookType: 'BEFORE_ACTION' | 'AFTER_DAMAGE' | 'BEFORE_LEAVE_COVER' | 'AFTER_RAID_END';
  readonly metadata: Record<string, unknown>;
}

export type IntentPayload =
  | { targetEntityId: string; type: 'DAMAGE'; value: { bodyPart: string; amount: number } }
  | { targetEntityId: string; type: 'STATUS_EFFECT'; value: 'BLEED_START' | 'HEAL' }
  | { targetEntityId: string; type: 'POSITION_CHANGE'; value: { to: string } }
  | { targetEntityId: string; type: 'XP'; value: number }
  | { targetEntityId: string; type: 'STASH_ADD'; value: { itemId: string; quantity: number } };

export interface BehaviorModule<TActor = any, TTarget = any> {
  readonly id: string;
  canExecute(actor: TActor, target: TTarget, context: EngineContext): boolean;
  canInterrupt(actor: TActor, hook: InterruptHook, context: EngineContext): boolean;
  execute(actor: TActor, target: TTarget, context: EngineContext): AsyncGenerator<InterruptHook, void, unknown>;
}

export interface TickTelemetry {
  readonly tick: number;
  readonly phase: 'COMBAT' | 'LOOT' | 'MAINTENANCE' | 'NUTRITION_DECAY';
  readonly sourceEntityId: string;
  readonly emittedIntents: IntentPayload[];
  readonly appliedPatches: Record<string, unknown>[];
  readonly yieldedHooks: InterruptHook[];
}

export type InterceptorDirective =
  | { type: 'CONTINUE' }                            // Resume simulation normally
  | { type: 'INJECT_INTENT'; intent: IntentPayload }   // Inject custom Intent into current settlement batch
  | { type: 'CANCEL_ACTION'; reason: string };      // Abort pending action (e.g. force flee)
```

#### 3. Async Generator Interceptors
Combat and raid execution loops become yieldable generator functions:
```typescript
// Example: Action execution stream yielding interception points
export async function* executeCombatAction(
  actor: Entity,
  target: Entity,
  context: EngineContext
): AsyncGenerator<InterruptHook, void, unknown> {
  yield {
    sourceEntityId: actor.id,
    hookType: 'BEFORE_ACTION',
    metadata: { action: 'fire', weaponId: actor.weapon.id }
  };
  
  // Calculate damage and emit Intent instead of direct mutation
  context.emitIntent({
    targetEntityId: target.id,
    type: 'DAMAGE',
    value: { bodyPart: 'thorax', amount: 45 }
  });

  yield {
    sourceEntityId: target.id,
    hookType: 'AFTER_DAMAGE',
    metadata: { damageDealt: 45 }
  };
}
```

#### 4. Stateful Hideout Plugin System
Hideout modules act as stateful plugins loaded at runtime:
- **Scavenger Workstation**: Listens for `AFTER_RAID_END`, checks cooldown, and emits `STASH_ADD` intents.
- **Shooting Range / Training Minigame**: Runs as an `AsyncGenerator` flow yielding `MINIGAME_STEP` hooks for the UI, emitting permanent skill XP intents upon completion.

#### 5. Agentic Telemetry & Interceptor Protocol (Agent Control Surfaces)

To enable external AI agents, autonomous test runners, and UI step-debuggers to validate simulation ticks deterministically, `EngineContext` exposes **3 programmatic control surfaces**:

##### A. Structured Telemetry Stream (`TickTelemetry`)
Rather than forcing agents to parse natural language UI strings (e.g. `"SURVIVOR PASSIVE: Free Reload triggered!"`), every tick emits a structured JSON telemetry log:
```typescript
export interface TickTelemetry {
  readonly tick: number;
  readonly phase: 'COMBAT' | 'LOOT' | 'MAINTENANCE' | 'NUTRITION_DECAY';
  readonly sourceEntityId: string;
  readonly emittedIntents: IntentPayload[];
  readonly appliedPatches: Record<string, unknown>[];
  readonly yieldedHooks: InterruptHook[];
}
```

##### B. Interceptor Directives (`InterceptorDirective`)
When an `InterruptHook` yields at a control point (`BEFORE_ACTION`, `AFTER_DAMAGE`, `BEFORE_LEAVE_COVER`, `AFTER_RAID_END`), an observing agent or test harness can return an explicit control directive to manipulate execution:
```typescript
export type InterceptorDirective =
  | { type: 'CONTINUE' }                            // Resume simulation normally
  | { type: 'INJECT_INTENT'; intent: IntentPayload }   // Inject custom Intent into current settlement batch
  | { type: 'CANCEL_ACTION'; reason: string };      // Abort pending action (e.g. force flee)
```

##### C. Seeded Determinism & Read-Only Query Surface
- **RNG Seed Injection**: `EngineContext` accepts an optional `seed: number` to guarantee 100% reproducible random rolls across combat ballistics, dodge chances, and loot generation.
- **Read-Only Query Boundary**: `context.queryEnvironment(query)` allows validating agents to inspect ammo reserves, armor durability, or map tile hazards without mutating engine state.

---

## Act V: Presentation Blueprint & Causal Feature Mapping

### 1. Causal Feature-Architecture Matrix

| TARCOS Game Feature | Current Code Pain | Target Architecture Decision | Benefit to Human & AI Developers |
| :--- | :--- | :--- | :--- |
| **Hideout Stash Upgrades** | `loot.ts:L76` hardcodes `secureCap = 4` due to duplicate sorting code in `raidSimulation.ts`. | **Data-Driven `lootManagement.ts`**: Centralized container capacity & value sorting. | Eliminates silent divergence bugs; stash upgrades apply consistently. |
| **PMC Class Passives** | Passives hardcoded across 5 conditionals in `combat.ts:L141-277`. | **`BehaviorModule` Strategy Pattern + `combatBalance.ts`**: Decoupled passive modules. | New classes added as standalone files; balance tweaks are pure data edits. |
| **Zero-Player Autonomous Simulation** | Combat executes in synchronous `while` loops with direct inline mutations. | **`AsyncGenerator` Interceptors + `InterruptHook` System**: Yieldable tick generator. | AI agents, bots, or UI debuggers can hook into ticks, inspect state, and yield seamlessly. |
| **Raid Health & Death Outcomes** | 48 lines of identical KIA processing duplicated across dehydration & combat death paths (`raidSimulation.ts`). | **Centralized `raidResolution.ts` (`handleKIA`) + Intent Settlement Queue**: Atomic intent settlement. | Guarantees zero state corruption; quest finalization and XP rewards are 100% uniform. |
| **Dynamic Ammo Ballistics & Enemy Tiers** | Armor threshold formulas and tier stat ranges scattered in ternary logic (`combat.ts`, `spawning.ts`). | **Data-Driven Tuning (`data/tuning/*`)**: Decoupled config files. | Automated LLM balance tuning and human design tweaks occur in pure JSON-like config files. |

---

### 2. Slide Deck Outline (8-Slide Presentation Blueprint)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 1: Title & Vision                                                           │
│ Title: TARCOS Engine Architecture — From Monolith to Autonomous Agentic Substrate │
│ Bullet Points:                                                                    │
│ • What is TARCOS? Zero-player extraction roguelike driven by autonomous simulation.│
│ • Core Challenge: The engine IS the player — control flow must be yieldable.       │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 2: The Prototyping Trap & Code Scaling                                      │
│ Title: How Rapid Prototyping Created Structural Friction                          │
│ Bullet Points:                                                                    │
│ • Imperative beginnings: direct mutations inside orchestrators.                   │
│ • Scaling to 5 classes, 3 tiers, 100+ items created 350+ line monoliths.          │
│ • Mutation Fear: Heavy JSON.parse(JSON.stringify(state)) on every tick.           │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 3: Grounded Case Studies of Failure                                         │
│ Title: Concrete Code Pains in TARCOS                                              │
│ Bullet Points:                                                                    │
│ • Intelligence Center Bug: loot.ts hardcodes container size 4 vs raidSimulation.ts.│
│ • Duplicated KIA Logic: 48 lines repeated verbatim across death paths.            │
│ • Scattered Class Passives: 5 conditionals embedded in combat ballistics loops.   │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 4: The Developer & AI Coding Friction                                       │
│ Title: Why the Monolith Stifles Human & AI Collaboration                          │
│ Bullet Points:                                                                    │
│ • Human Friction: Rebalancing requires code edits & complex regression testing.   │
│ • AI Agent Friction: Large prompt context bloat & hallucination risk on duplicate code.│
│ • Step Lock-in: Synchronous loops prevent mid-round interception.                  │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 5: The Dual-Pillar Solution                                                 │
│ Title: Architecture Overview — Data Substrate + Intent Pipeline                   │
│ Bullet Points:                                                                    │
│ • Pillar A: Data-Driven Substrate (split data.ts, centralize algorithms).         │
│ • Pillar B: Agentic Intent Engine (EngineContext, Intent queue, AsyncGenerators). │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 6: Grounded Feature-Architecture Mapping                                    │
│ Title: Connecting Game Features to Architectural Patterns                         │
│ Bullet Points:                                                                    │
│ • Hideout Stash Upgrades -> Data-Driven lootManagement.ts                         │
│ • Class Passives -> BehaviorModule Strategy Interfaces                            │
│ • Autonomous Rounds -> AsyncGenerator Interceptor Hooks                           │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 7: Phased Migration Roadmap                                                 │
│ Title: 5-Phase Refactoring Plan                                                   │
│ Bullet Points:                                                                    │
│ • Phase 1: Data-driven tuning extraction & deduplication.                         │
│ • Phase 2: EngineContext & Intent settlement queue.                               │
│ • Phase 3: AsyncGenerator interceptor pipeline.                                   │
│ • Phase 4: BehaviorModule & Hideout plugin migration.                             │
│ • Phase 5: Verification & unit testing.                                           │
└───────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 8: Expected ROI & Future Agentic Capabilities                               │
│ Title: Transformation Outcomes                                                    │
│ Bullet Points:                                                                    │
│ • 95% reduction in code duplication; 40% reduction in orchestrator size.           │
│ • Zero-risk balance tweaking via pure data config edits.                          │
│ • Native yield points for AI bots, step-debuggers, and rich UI visualizations.     │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Act VI: Agentic Maintainability Guardrails — Governance for AI-Assisted Development

> **The AI-Assisted Architecture Dilemma**: TARCOS is an experiment in whether a greenfield codebase can remain maintainable despite being built rapidly with AI coding assistance. AI agents (including LLM assistants and autonomous coding subagents) lack human "maintainer discomfort"—they do not feel friction when appending 50 lines to a 350-line file, copying code snippets inline, or inventing bespoke abstractions. Without structural guardrails, AI-assisted development accelerates technical debt at the same speed it generates features.

The following 6 guardrails govern all future human and AI-agent contributions to TARCOS:

### Guardrail 1: Pre-Defined Module Boundaries & Enforced Scope Caps
- **The Principle**: Module boundaries and import directions must be established before code is written, backed by explicit size budgets so growth past intended scope fails loudly instead of accumulating silently.
- **TARCOS Grounding**: `raidSimulation.ts` ballooned to 336 lines and `combat.ts` to 309 lines because AI agents repeatedly took the locally-easy path of appending new features (combat rounds, death handling, looting, decay) into orchestrators.
- **Enforcement Rule**: Orchestrator modules have a strict budget cap of ~200 lines. The import direction is strictly uni-directional:
  $$\text{data/content \& data/tuning} \longrightarrow \text{engine/modules} \longrightarrow \text{engine/orchestrators} \longrightarrow \text{UI}$$
  Any PR or agent edit that violates import hierarchy or pushes an orchestrator over 200 lines must trigger an automated lint/CI failure requiring modular extraction.

### Guardrail 2: Structural Single Source of Truth (Make Duplication Harder Than Importing)
- **The Principle**: Any algorithm or domain calculation that could plausibly be reimplemented inline must have exactly one exported source of truth. Importing that function must present lower friction than writing it inline.
- **TARCOS Grounding**: In [loot.ts:L76](file:///d:/DOWNLOADS/vscode/tarkov-zero-player-roguelike/src/engine/loot.ts#L76), an AI agent hardcoded `const secureCap = 4` and reimplemented container value sorting because re-writing the sorting loop inline was locally "easier" than searching for `raidSimulation.ts`'s container sorting code. This caused the Intelligence Center stash upgrade bug.
- **Enforcement Rule**: Centralize domain algorithms into dedicated single-responsibility utility modules (`lootManagement.ts`, `raidResolution.ts`). Functions like `sortLootIntoContainers()` and `handleKIA()` must be structured so that calling them requires fewer lines of code and zero cognitive overhead compared to writing inline logic.

### Guardrail 3: Strict Isolation of Balance Tuning from Engine Logic
- **The Principle**: Game balance values and tuning formulas belong exclusively in `src/data/tuning/*`, never in engine conditionals. Changing game balance must never require touching core execution logic.
- **TARCOS Grounding**: Ballistics penetration tables ([combat.ts:L216](file:///d:/DOWNLOADS/vscode/tarkov-zero-player-roguelike/src/engine/combat.ts#L216)), Scout dodge multipliers ([combat.ts:L200](file:///d:/DOWNLOADS/vscode/tarkov-zero-player-roguelike/src/engine/combat.ts#L200)), and nutrition decay probabilities ([raidSimulation.ts:L36](file:///d:/DOWNLOADS/vscode/tarkov-zero-player-roguelike/src/engine/raidSimulation.ts#L36)) were written as inline ternary chains and magic numbers directly inside simulation loops.
- **Enforcement Rule**: Engine orchestrators (`combat.ts`, `raidSimulation.ts`) and behavior modules are strictly forbidden from defining magic numbers or class-name strings. All balance values must be imported from `src/data/tuning/*` (`combatBalance.ts`, `raidConfig.ts`, `enemySpawning.ts`). An AI agent tasked with "rebalancing ammo" MUST edit a config file, not engine logic.

### Guardrail 4: Standardize on Conventional Patterns over Bespoke Abstractions
- **The Principle**: When a conventional, widely-understood pattern and a custom bespoke abstraction solve the same problem, default to the conventional pattern. Bespoke abstractions force every new contributor and fresh AI agent session to re-learn custom rules.
- **TARCOS Grounding**: To handle mutation fear during ticks, early code introduced custom inline deep-cloning (`JSON.parse(JSON.stringify(state))` at [raidSimulation.ts:L20](file:///d:/DOWNLOADS/vscode/tarkov-zero-player-roguelike/src/engine/raidSimulation.ts#L20)) and bespoke state mutation patterns rather than standard TypeScript design patterns.
- **Enforcement Rule**: Standardize TARCOS architecture on established Gang-of-Four and language-native idioms: Async Generator iterators for interruptible execution, Strategy Pattern `BehaviorModule` for class passives, and standard Command/Intent queues (`IntentPayload`) for state settlement. Avoid introducing custom state management frameworks or bespoke mini-engines.

### Guardrail 5: Executable Contract & Characterization Tests over Static Documentation
- **The Principle**: Documentation alone does not stop an AI agent from breaking contracts or introducing regressions; only executable automated tests do. High-risk refactors require pre-existing characterization tests (Golden Master baselines), and single-source functions require contract tests.
- **TARCOS Grounding**: Documentation in `arch_todo.md` did not prevent duplicated 48-line death processing blocks across `raidSimulation.ts:L55` and `L111`. AI agents routinely missed one block because no contract test failed.
- **Enforcement Rule**: High-risk refactors (specifically Phase 3's `AsyncGenerator` migration) REQUIRE writing deterministic Characterization Tests against the current baseline *before* modifying code. Core utility exports (`handleKIA`, `sortLootIntoContainers`) must have unit contract tests. An agent cannot declare a task complete without running `npm test`.

### Guardrail 6: Micro-Diff Enforcement (One File, One Intent per Edit)
- **The Principle**: Changes must remain small, focused, and reviewable. Large multi-file diffs make duplicate logic, silent divergence bugs, and unintended side-effects trivial to miss during review.
- **TARCOS Grounding**: Multi-file refactors during early prototyping allowed the `loot.ts` secure container size bug to slip past undetected.
- **Enforcement Rule**: Every AI-agent task or PR must address a single, discrete intent affecting minimal files. An agent must not mix balance tweaking, algorithm deduplication, and control flow refactoring into a single mega-edit.

---

## Phased Master Implementation Roadmap & Checklist

### Phase 1: Data-Driven Tuning Extraction & Code Deduplication
- [x] Create `src/data/tuning/raidConfig.ts` (decay rates, status thresholds).
- [x] Create `src/engine/raidResolution.ts` with `handleKIA(state, reason)` & `handleExtraction(state)`. Remove 48-line duplicate block from `raidSimulation.ts`.
- [x] Create `src/engine/lootManagement.ts` with `sortLootIntoContainers` & `SECURE_CONTAINER_CAPACITY`. Fix `loot.ts:L76` bug.
- [x] Create `src/data/tuning/enemySpawning.ts` with `ENEMY_SPAWN_PROFILES`.
- [x] Create `src/data/tuning/medicalConfig.ts` with `findBackupMedical` helper.

### Completed Work Log

#### 2026-07-31 — Phase 1 Slice: `lootManagement.ts` Centralization
- **Intent**: Single source of truth for secure-container capacity & value sorting; fix the Intelligence Center bug.
- **Changes**:
  - Created `src/engine/lootManagement.ts` (`SECURE_CONTAINER_CAPACITY`, `sortLootIntoContainers`).
  - Rewired `loot.ts` — replaced hardcoded `secureCap = 4` with `SECURE_CONTAINER_CAPACITY(intelligenceCenterLevel)` and the 22-line inline sort with the shared call (fixes the Intelligence Center stash-upgrade bug).
  - Rewired `raidSimulation.ts` — removed the inline cap ternary and the identical 22-line sort; both `executeLootPhase` call sites now pass `hideout.intelligenceCenter.level`.
  - Added `src/engine/lootManagement.test.ts` (7 deterministic contract tests: cap mapping, value-order partitioning, quantity aggregation, edge cases).
  - Added barrel export in `gameEngine.ts`.
- **Behavior**: Verbatim port of the existing algorithm; the only behavior change is the bug fix. No RNG involvement, no semantic drift.
- **Verification**: `npm test` — 14/14 pass; `npm run lint` (`tsc --noEmit`) — clean.
- **Residual duplication** (remaining Phase 1 slices): KIA resolution pipeline ×3 sites, medical backup search predicates ×3 sites in `maintenance.ts`.

#### 2026-07-31 — Phase 1 Slice: `raidResolution.ts` Centralization
- **Intent**: Single source of truth for raid death/extraction resolution; remove the 48-line duplicated KIA pipeline (dehydration vs combat) and consolidate the extraction pipeline.
- **Changes**:
  - Created `src/engine/raidResolution.ts` with `handleKIA(state, reason)` (`"dehydration" | "combat"`) and `handleExtraction(state)`, plus module-private helpers `gainPerceptionXp`, `levelUpLoop`, and `moveIntoStash` (extraction loot banking).
  - Added `src/engine/raidResolution.test.ts` — 4 characterization tests (Golden Master) locking current `runRaidTick` behavior for dehydration KIA, dehydration KIA level-up, combat KIA (fatal head shot), and extraction.
  - Rewired `raidSimulation.ts` — the dehydration KIA block, combat KIA block, and extraction block each became a single delegated call; removed ~170 lines of inline pipeline code.
  - Added barrel export in `gameEngine.ts`.
- **Behavior**: Verbatim port; all pipelines produce identical logs and state transitions (verified by characterization tests re-run green after rewiring).
- **Notable finding**: `createLog` (utils.ts:16) consumes `Math.random()` for log entry `id`, so every log line shifts RNG consumption — characterization tests must account for log-count-dependent RNG alignment.
- **Verification**: `npm test` — 18/18 pass; `npm run lint` (`tsc --noEmit`) — clean.
- **Residual duplication** (remaining Phase 1 slices): medical backup search predicates ×3 sites in `maintenance.ts`, enemy spawn profiles, decay/status thresholds.

#### 2026-07-31 — Phase 2 Slice: EngineContext & Intent Settlement Queue Core
- **Intent**: Layer a stepping/interception contract over the engine without changing simulation results; groundwork for Phase 3's async pipeline.
- **Changes**:
  - Added `src/engine/types.ts`: engine contract types (`IntentPayload`, `KIAReason`, `EnvironmentQuery`/`Result`, `EngineContext`, `InterruptHook`, `TickPhase`, `AppliedPatch`, `TickTelemetry`, `InterceptorDirective`, `BehaviorModule`).
  - Added `src/engine/engineContext.ts`: `applyIntent` pure reducer (DAMAGE / STATUS_EFFECT / POSITION_CHANGE / XP / STASH_ADD) + `createEngineContext` runtime adapter with atomic pending-intent accumulation, `settle()` → `TickTelemetry`, and `queryEnvironment` read-only queries.
  - Converted direct mutations to intent emission: combat damage (`combat.ts`) via `DAMAGE` intents, kill XP and stage advancement (`raidSimulation.ts`) via `XP` / `POSITION_CHANGE`. Results unchanged.
  - Added barrel exports in `gameEngine.ts` (`./engine/types`, `./engine/engineContext`).
- **Behavior**: Verbatim port; all 30 tests green (12 new `engineContext.test.ts` cases; `gameEngine.test.ts` gained `createTestContext` helper for the 4 direct `simulateCombatRound` call sites).
- **Known deviations / deferred**: `POSITION_CHANGE` uses `{ to: number }` (tile index) per `applyIntent` contract; BLEED_START emission deferred until combat's bleed gate is handled inside the settlement step (documented in `types.ts`); PMC `weaponAmmo` query reads the stash (PMCCharacter has no `equippedWeapon`).
- **Verification**: `npm test` — 30/30 pass; `npm run lint` (`tsc --noEmit`) — clean.
- **Bridge to Phase 3**: `runRaidTick` still mutates `newState` in place and uses a pre-created `EngineContext` handle per tick; settlement returns a telemetry record consumed by callers. Direct `simulateCombatRound` call sites now require an `EngineContext` — Phase 3 must audit these plus UI callers.

### Phase 2: EngineContext & Intent Settlement Queue Core
- [x] Create `src/engine/types.ts` defining `EngineContext`, `IntentPayload`, `InterruptHook`, `BehaviorModule`.
- [x] Implement runtime `EngineContext` adapter in `src/engine/engineContext.ts` with atomic intent accumulation & settlement step.
- [x] Convert direct mutations in `combat.ts` and `raidSimulation.ts` to `context.emitIntent()`.

#### 2026-07-31 — Phase 1 Final Slices: Tuning Extraction (`raidConfig.ts`, `enemySpawning.ts`, `medicalConfig.ts`)
- **Intent**: Move all raid/nutrition balance values, enemy spawn tables, and medical backup logic into `src/data/tuning/` — completing the "Pure Config Balancing" pillar and satisfying the enforcement rule (engine orchestrators must not define magic numbers).
- **Changes**:
  - Added `src/data/tuning/raidConfig.ts` — tick advancement, energy/hydration decay chances, Nutrition Unit + Constitution decay reductions, `HYDRATION_STATUS` bands, status warning chance, maintenance hydration drain, provision drink threshold.
  - Added `src/data/tuning/enemySpawning.ts` — `ENEMY_SPAWN_PROFILES` (per-tier names, level formulas, stat ranges, base accuracy, weapon/armor/helmet tables) + `LEVEL_STAT_SCALE` + raid spawn constants (`ENCOUNTER_CHANCE`, `REINFORCEMENT_MAX_PER_TILE`, `REINFORCEMENT_CHANCE`).
  - Added `src/data/tuning/medicalConfig.ts` — `findBackupMedical(entries, kind, minResource)` + `consumeFoundEntry(entries, index)` + `BLEED_STOP_COST` + `DEFAULT_HEAL_RESTORE`.
  - Rewired `spawning.ts` (profile-driven `spawnEnemy`), `maintenance.ts` (4 backup-search predicates + 4 consume blocks → shared helpers), `raidSimulation.ts` (all decay/status/spawn constants).
- **Behavior**: Verbatim port. The surgical-kit predicate changed from `id.includes("kit")` to `medicalSubType === "surgical"` — provably equivalent for all current medical items (only surgical kits contain "kit"); verified by the untouched characterization tests passing. `spawnEnemy` RNG call sequence/count is preserved exactly per tier.
- **Verification**: `npm test` — 51/51 pass (21 new data-contract tests across the 3 tuning files); `npm run lint` (`tsc --noEmit`) — clean.
- **Residual**: `combat.ts` hydration penalty bands + burst accuracy decay remain local — owned by the future `combatBalance.ts` slice. Remaining roadmap work is Phase 3+.

#### 2026-07-31 — Phase 3 Prerequisite: Golden Master Characterization Baseline
- **Intent**: Freeze the current `runRaidTick` behavior as committed, deterministic JSON transcripts so the Phase 3 AsyncGenerator conversion can be validated for byte-for-byte behavioral parity — satisfying Guardrail 5's "characterization tests BEFORE modifying code" rule.
- **Changes**:
  - Added `src/engine/characterization/goldenHarness.ts` — self-contained harness: `mulberry32` PRNG + `installSeed(seed)` driving `Math.random()` (single spy; `vi.restoreAllMocks()` in `afterEach`), a fresh-deploy state factory (`createInitialPMC(SOLDIER)` under the seeded RNG so skill distribution is deterministic, loaded signature weapon, default hideout), an explicit-field transcript serializer (elapsedSeconds, stage, status, killsByTier, PMC vitals/equipment/ammo, combatTarget HP array, loot/secure-container/stash items, per-tick log messages+types), and `runScenario(seed, configure, maxTicks=300)`.
  - Added `src/engine/characterization/goldenMaster.test.ts` — 3 scenarios via `toMatchFileSnapshot` into `src/engine/__golden__/scenario-*.json` (regenerated with `vitest run -u`): extraction run (seed 4 → extracted in 24 ticks), preset combat vs a hand-built deterministic Scav (seed 1337 → extracted in 45 ticks), dehydration KIA (seed 7 → 1 tick). Plus transcript invariants: non-negative HP/kills/energy/hydration bounds and exactly one terminal status matching the final tick.
- **Notable findings**:
  - The harness exposed a subtle determinism hazard of its own — ticks must compound (`state = next`), not re-clone the pristine original, or the map rebuilds and combat re-simulates identically every tick.
  - Fresh SOLDIER PMCs KIA ~2/3 of the time on Factory (seeds 1–60 probe: 36 kia / 24 extracted) — the extraction scenario uses seed 4 deliberately.
- **Verification**: `npm test` — 54/54 pass (3 new golden tests); `npm run lint` (`tsc --noEmit`) — clean. Snapshot stability confirmed via un-updated re-run.
- **Bridge to Phase 3**: `goldenHarness.ts` exercises the full `runRaidTick` → `createEngineContext` → combat/loot/maintenance/raidResolution flow under a fixed seed; an AsyncGenerator-converted `runRaidTick` must reproduce these transcripts unchanged.

#### 2026-07-31 — Phase 3 Slice: `simulateCombatRound` AsyncGenerator Conversion
- **Intent**: First control-flow conversion — make the combat round yieldable (prerequisite for the raid tick pipeline and Phase 4 interceptors) while preserving byte-for-byte transcript parity.
- **Changes**:
  - Renamed the sync function body to `simulateCombatRoundGenerator` (`Generator<InterruptHook, RaidLog[], unknown>`) in `combat.ts`; added `BEFORE_ACTION` (action decided, pre-execution) and `AFTER_DAMAGE` (per landed bullet) `InterruptHook` yields. Yield points consume no RNG and mutate no state.
  - Sync wrapper `simulateCombatRound` drains the generator; async wrapper `simulateCombatRoundAsync` uses `return yield* simulateCombatRoundGenerator(...)` (bare `yield*` drops the inner return value).
  - **Root-cause fix**: `spawnEnemy`/`rollEquipment` handed out direct `ALL_ITEMS` armor/helmet template references (unlike `createInitialPMC`'s shallow copy at `data.ts:353`), so combat armor-durability mutations leaked into the shared templates and poisoned later runs at identical seeds. Fixed with an RNG-neutral `cloneEquipment` (deep clone) at all three `rollEquipment` armor/helmet call sites in `spawning.ts`.
  - Added `combatGenerator.test.ts` (3 tests): sync-vs-async parity under seed 4242, hook-shape/domain validation, `AFTER_DAMAGE` count === landed `[DMG]` log count (`[PEN]` logs are also `combat_damage`-typed, so the assertion counts only `[DMG]`).
- **Behavior**: Sync path byte-identical (parity test + goldens); the spawnEnemy fix changes armored-enemy starting durability (full instead of previously-mutated values) — goldens regenerated with `-u` and stable on re-run.
- **Verification**: `npm test` — 57/57 pass; `npm run lint` (`tsc --noEmit`) — clean. Debug artifacts (`debug.test.ts`, `debug.txt`) deleted.
- **Residual**: `runRaidTick` (raidSimulation.ts) is the next AsyncGenerator conversion target, verified against the same committed goldens.

#### 2026-07-31 — Phase 3 Slice: `runRaidTick` AsyncGenerator Conversion
- **Intent**: Complete the Phase 3 primary-tick conversion — make the full raid tick yieldable (combat + raid resolution) while preserving byte-for-byte parity with the committed Golden Master transcripts.
- **Changes**:
  - Renamed the sync body to `runRaidTickGenerator` (`Generator<InterruptHook, GameState, unknown>`) in `raidSimulation.ts`; sync wrapper `runRaidTick` drains it; async wrapper `runRaidTickAsync` uses `return yield* runRaidTickGenerator(...)`.
  - Combat delegation changed from `simulateCombatRound(...)` to `yield* simulateCombatRoundGenerator(...)` — the tick generator now **forwards** combat `BEFORE_ACTION`/`AFTER_DAMAGE` hooks into the tick hook stream while capturing the round logs via the inner return value.
  - Added `AFTER_RAID_END` yields (metadata `{ status }`, "kia"/"extracted") at all three raid-ending return sites: dehydration KIA, combat KIA, and extraction.
  - Added `raidTickGenerator.test.ts` (5 tests): sync-vs-async full-run parity for extraction/combat/dehydration seeds (4, 1337, 7), wrapper-vs-drainer identity, single `AFTER_RAID_END` with resolved status, forwarded combat hook validation (present in combat/extraction runs — extraction legitimately fights encounters; absent in the 1-tick dehydration run), and inactive-raid pass-through (input state returned unchanged, no hooks).
- **Behavior**: Byte-for-byte parity — goldens were NOT regenerated and still pass against the committed transcripts (62/62 suite green). Yield points consume no RNG and mutate no state.
- **Verification**: `npm test` — 62/62 pass; `npm run lint` (`tsc --noEmit`) — clean.
- **Bridge to Phase 4**: `runRaidTickGenerator` is now the single observable tick stream (`BEFORE_ACTION` / `AFTER_DAMAGE` / `AFTER_RAID_END`); `BehaviorModule.execute` (`types.ts`) already matches this contract for hideout/class interceptor plugins.

### Phase 3: Async Generator Action Pipeline & Interceptors (HIGH-RISK PHASE)

> [!WARNING]
> **High-Risk Phase**: Converting synchronous `while` loops (`simulateCombatRound`, `runRaidTick`) into yieldable `AsyncGenerator` flows touches every call site across the UI and test suites. Strict risk mitigation is required.

- [x] **PREREQUISITE — Characterization Testing Baseline**:
  - Before modifying control flow, write deterministic **Characterization Tests** (Golden Master snapshot tests using fixed RNG seeds).
  - Record the exact tick-by-tick state transitions, inventory outcomes, and log outputs of the current engine across combat, scavenging, and extraction scenarios.
  - *Purpose*: This baseline allows developers to clearly distinguish **intentional bug fixes** (e.g., container cap fix, unified KIA processing) from **unintended regressions** in tick timing or state mutation ordering.
- [x] Convert primary simulation ticks (`runRaidTick` and `simulateCombatRound`) into `AsyncGenerator` flows yielding `InterruptHook` objects at `BEFORE_ACTION` and `AFTER_DAMAGE`.
- [ ] Update engine callers (UI loop / test harness) to consume generator flows.
- [ ] **State Mutation Semantics Audit & Immutable Settlement Transition**:
  - *Audit*: Before removing `JSON.parse(JSON.stringify(state))` at `raidSimulation.ts:L20`, audit all UI state handlers, log previewers, and test harnesses that rely on `runRaidTick` treating input state as an immutable reference.
  - *Replacement Mechanism*: Ensure `EngineContext` settlement produces a fresh state reference atomically via structural patching (or shallow `Object.assign`/`Immer` patches) at the end of settlement steps, replacing full-tree stringify deep cloning without breaking caller immutability expectations.

### Phase 4: BehaviorModule Refactoring & Hideout Plugin System
- [ ] Extract PMC class passives (`SURVIVOR`, `SCOUT`, `SOLDIER`, `LUCKY`) into `src/engine/behaviors/`.
- [ ] Implement Hideout plugin adapter interface (`ModuleInstance`) and convert Scavenger workstation to `AFTER_RAID_END` hook listener.

### Phase 5: Split `data.ts` & Final Verification
- [ ] Split `src/data.ts` into `src/data/content/*` (`items`, `maps`, `quests`, `weapons`) and `src/data/tuning/*`.
- [ ] Update imports across codebase.
- [ ] Run `npm test` and execute full manual verification (deploy, raid, loot, extract, upgrade hideout).

---

## Metrics & Impact Summary

> **Progress as of 2026-07-31**: **Phase 1 complete** — `raidSimulation.ts` 336 → 173 lines, `loot.ts` 115 → 98 lines, duplicated container-sort code 44 → 0 lines, duplicated KIA/extraction pipeline ~170 → 0 lines (centralized in `raidResolution.ts`); all raid/nutrition/enemy-spawn/medical balance values moved into `src/data/tuning/` (`raidConfig.ts`, `enemySpawning.ts`, `medicalConfig.ts`). **Phase 2 core complete** — engine contract layer (`engineContext.ts` + `types.ts`, 12 tests) added; simulation results unchanged. **Phase 3 prerequisite complete** — Golden Master characterization baseline (`goldenHarness.ts` + `goldenMaster.test.ts`, 3 committed transcripts under `src/engine/__golden__/`) freezes `runRaidTick` behavior for extraction/combat/dehydration scenarios. **Phase 3 control-flow conversion complete** — `simulateCombatRound` and `runRaidTick` are both yieldable generators (sync drainer + `return yield*` async variant); the tick generator forwards combat hooks and emits `AFTER_RAID_END` on KIA/extraction, verified byte-for-byte against the un-regenerated goldens; also fixed a shared-`ALL_ITEMS` armor/helmet template mutation leak in `spawnEnemy` (armored enemies now start with full durability). 62/62 tests green. Remaining targets below are unchanged.

| Metric | Baseline | Target | Improvement |
| :--- | :--- | :--- | :--- |
| **Total Engine Lines** | 1,290 lines | ~1,050 lines | **-19% reduction** |
| **`raidSimulation.ts` Size** | 336 lines | ~200 lines | **-40% reduction** |
| **`spawning.ts` Size** | 161 lines | ~80 lines | **-50% reduction** |
| **Duplicated Code** | ~100 lines | ~5 lines | **-95% reduction** |
| **Hardcoded Magic Numbers** | 50+ instances | 5 instances | **-90% reduction** |
| **PMC Class Touchpoints** | 5 scattered conditionals | 1 modular config | **-80% coupling** |
| **Tick State Deep-Clones** | 1 per tick (`JSON.parse`) | 0 (Atomic Settlement) | **100% eliminated** |
