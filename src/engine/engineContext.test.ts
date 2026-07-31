import { describe, it, expect } from 'vitest';
import { createEngineContext, applyIntent } from './engineContext';
import { createInitialPMC, createInitialHideout, ALL_MAPS } from '../data';
import { ClassType, GameState, RaidState, Stash, Weapon, GameItem, EnemyState } from '../types';

const makeItem = (id: string, value: number): GameItem => ({
  id,
  name: id,
  description: "",
  type: "valuable",
  rarity: "common",
  value,
  iconName: "gem",
});

const makeWeapon = (id: string): Weapon => ({
  id,
  name: "Test Weapon (7.62x39mm)",
  baseErgo: 50,
  baseRecoil: 85,
  baseDmg: 50,
  baseAccuracy: 50,
  mods: {},
  signatureClass: ClassType.SOLDIER,
  caliber: "7.62x39mm",
  currentMagRounds: 30,
  maxMagSize: 30,
  reserveMags: 3,
  maxReserveMags: 3,
});

const makeEnemy = (): EnemyState => ({
  name: "Test Scav",
  tier: "Scav",
  level: 1,
  bodyParts: {
    head: { id: "head", name: "Head", current: 35, max: 35 },
    thorax: { id: "thorax", name: "Thorax", current: 85, max: 85 },
    stomach: { id: "stomach", name: "Stomach", current: 70, max: 70 },
    leftArm: { id: "leftArm", name: "Left Arm", current: 60, max: 60 },
    rightArm: { id: "rightArm", name: "Right Arm", current: 60, max: 60 },
    leftLeg: { id: "leftLeg", name: "Left Leg", current: 65, max: 65 },
    rightLeg: { id: "rightLeg", name: "Right Leg", current: 65, max: 65 },
  },
  skills: {
    weaponSkill: { id: "weaponSkill", name: "Weapon Skill", description: "", level: 1, xp: 0, maxXp: 100, bonusPerLevel: "" },
    constitution: { id: "constitution", name: "Constitution", description: "", level: 1, xp: 0, maxXp: 100, bonusPerLevel: "" },
    perception: { id: "perception", name: "Perception", description: "", level: 1, xp: 0, maxXp: 100, bonusPerLevel: "" },
    initiative: { id: "initiative", name: "Initiative", description: "", level: 1, xp: 0, maxXp: 100, bonusPerLevel: "" },
    agility: { id: "agility", name: "Agility", description: "", level: 1, xp: 0, maxXp: 100, bonusPerLevel: "" },
  },
  baseAccuracy: 30,
  equippedWeapon: makeWeapon("enemy_weapon"),
  equippedArmor: null,
  equippedHelmet: null,
  isBleeding: false,
  isCovered: false,
  isDead: false,
});

const makeState = (): GameState => {
  const pmc = createInitialPMC(ClassType.SOLDIER);
  const stash: Stash = {
    items: [{ item: makeItem("med_kit", 800), quantity: 2 }],
    roubles: 0,
    weapons: [makeWeapon("equipped_weapon")],
    equippedWeaponId: "equipped_weapon",
  };
  const raid: RaidState = {
    isActive: true,
    map: ALL_MAPS[0],
    tiles: [],
    currentStage: 3,
    status: "combat",
    combatTarget: makeEnemy(),
    logs: [],
    lootFound: [],
    secureContainerSaved: [],
    elapsedSeconds: 60,
    playSpeed: 1,
    usedMedkitDuringRaid: false,
    reinforcementsSpawnedThisTile: 0,
    killsByTier: { Scav: 0, PMC: 0, Boss: 0 },
  };
  return {
    pmc,
    stash,
    hideout: createInitialHideout(),
    activeRaid: raid,
    selectedMapId: ALL_MAPS[0].id,
    activeQuests: [],
    completedQuestIds: [],
    pastRaidOutcomes: [],
  };
};

describe('applyIntent (pure reducer)', () => {
  it('DAMAGE reduces the target body part and floors at 0', () => {
    const state = makeState();
    const headBefore = state.pmc.bodyParts.head.current;

    const patches = applyIntent(state, {
      targetEntityId: "pmc",
      type: "DAMAGE",
      value: { bodyPart: "head", amount: headBefore + 100 },
    });

    expect(state.pmc.bodyParts.head.current).toBe(0);
    expect(patches).toEqual([
      { entity: "pmc", field: "bodyParts.head", before: headBefore, after: 0 },
    ]);
  });

  it('DAMAGE targets the enemy via the active combat target', () => {
    const state = makeState();
    const enemy = state.activeRaid.combatTarget!;

    applyIntent(state, { targetEntityId: "enemy", type: "DAMAGE", value: { bodyPart: "thorax", amount: 30 } });

    expect(enemy.bodyParts.thorax.current).toBe(55);
  });

  it('DAMAGE throws for an unknown target entity', () => {
    const state = makeState();
    expect(() =>
      applyIntent(state, { targetEntityId: "boss", type: "DAMAGE", value: { bodyPart: "head", amount: 10 } })
    ).toThrow(/Unknown target entity/);
  });

  it('STATUS_EFFECT BLEED_START sets isBleeding on the target', () => {
    const state = makeState();
    expect(state.pmc.isBleeding).toBe(false);

    const patches = applyIntent(state, { targetEntityId: "pmc", type: "STATUS_EFFECT", value: "BLEED_START" });

    expect(state.pmc.isBleeding).toBe(true);
    expect(patches).toEqual([{ entity: "pmc", field: "isBleeding", before: false, after: true }]);
  });

  it('POSITION_CHANGE moves the raid to the given stage', () => {
    const state = makeState();
    expect(state.activeRaid.currentStage).toBe(3);

    const patches = applyIntent(state, { targetEntityId: "raid", type: "POSITION_CHANGE", value: { to: 4 } });

    expect(state.activeRaid.currentStage).toBe(4);
    expect(patches).toEqual([{ entity: "raid", field: "currentStage", before: 3, after: 4 }]);
  });

  it('XP adds to the PMC total XP', () => {
    const state = makeState();
    const before = state.pmc.xp;

    const patches = applyIntent(state, { targetEntityId: "pmc", type: "XP", value: 45 });

    expect(state.pmc.xp).toBe(before + 45);
    expect(patches).toEqual([{ entity: "pmc", field: "xp", before, after: before + 45 }]);
  });

  it('STASH_ADD merges into an existing stash stack', () => {
    const state = makeState();
    expect(state.stash.items.find(e => e.item.id === "med_kit")!.quantity).toBe(2);

    const patches = applyIntent(state, { targetEntityId: "stash", type: "STASH_ADD", value: { itemId: "med_kit", quantity: 3 } });

    expect(state.stash.items.find(e => e.item.id === "med_kit")!.quantity).toBe(5);
    expect(patches).toEqual([{ entity: "stash", field: "items.med_kit", before: 2, after: 5 }]);
  });

  it('STASH_ADD creates a new stash entry for a known item not yet in the stash', () => {
    const state = makeState();
    const stashCountBefore = state.stash.items.length;

    const patches = applyIntent(state, { targetEntityId: "stash", type: "STASH_ADD", value: { itemId: "ai2", quantity: 2 } });

    expect(state.stash.items).toHaveLength(stashCountBefore + 1);
    expect(state.stash.items.find(e => e.item.id === "ai2")!.quantity).toBe(2);
    expect(patches).toEqual([{ entity: "stash", field: "items.ai2", before: 0, after: 2 }]);
  });

  it('STASH_ADD throws for an unknown item id', () => {
    const state = makeState();
    expect(() =>
      applyIntent(state, { targetEntityId: "stash", type: "STASH_ADD", value: { itemId: "does_not_exist", quantity: 1 } })
    ).toThrow(/unknown item id/);
  });
});

describe('createEngineContext', () => {
  it('applies emitted intents to the wrapped state and records telemetry', () => {
    const state = makeState();
    const engine = createEngineContext(state, { tick: 7, phase: "COMBAT" });

    engine.context.emitIntent({ targetEntityId: "pmc", type: "XP", value: 20 });
    const leftArmBefore = state.pmc.bodyParts.leftArm.current;
    engine.context.emitIntent({ targetEntityId: "pmc", type: "DAMAGE", value: { bodyPart: "leftArm", amount: 10 } });

    expect(state.pmc.xp).toBe(20);
    expect(state.pmc.bodyParts.leftArm.current).toBe(leftArmBefore - 10);
    expect(engine.hasPendingIntents).toBe(true);
    expect(engine.pendingIntents).toHaveLength(2);

    const telemetry = engine.settle();
    expect(telemetry.tick).toBe(7);
    expect(telemetry.phase).toBe("COMBAT");
    expect(telemetry.sourceEntityId).toBe("runRaidTick");
    expect(telemetry.emittedIntents).toHaveLength(2);
    expect(telemetry.appliedPatches).toHaveLength(2);
    expect(telemetry.yieldedHooks).toEqual([]);

    expect(engine.hasPendingIntents).toBe(false);
    expect(engine.pendingIntents).toHaveLength(0);
  });

  it('setPhase switches the phase reported by the next settle', () => {
    const state = makeState();
    const engine = createEngineContext(state, { phase: "NUTRITION_DECAY" });
    engine.setPhase("MAINTENANCE");
    expect(engine.settle().phase).toBe("MAINTENANCE");
  });

  it('queryEnvironment exposes read-only values', () => {
    const state = makeState();
    state.pmc.equippedArmor = null;
    const engine = createEngineContext(state);
    const ctx = engine.context;

    expect(ctx.queryEnvironment({ kind: "bodyPartHp", entity: "pmc", part: "head" })).toBe(state.pmc.bodyParts.head.current);
    expect(ctx.queryEnvironment({ kind: "weaponAmmo", entity: "pmc" })).toBe(state.stash.weapons.find(w => w.id === state.stash.equippedWeaponId)!.currentMagRounds);
    expect(ctx.queryEnvironment({ kind: "weaponAmmo", entity: "enemy" })).toBe(state.activeRaid.combatTarget!.equippedWeapon.currentMagRounds);
    expect(ctx.queryEnvironment({ kind: "armorDurability", entity: "pmc" })).toBeNull();
    expect(ctx.queryEnvironment({ kind: "raidStatus" })).toBe("combat");
    expect(ctx.queryEnvironment({ kind: "hydration", entity: "pmc" })).toBe(state.pmc.hydration);
    expect(ctx.queryEnvironment({ kind: "isBleeding", entity: "enemy" })).toBe(false);
  });

  it('queryEnvironment throws when resolving a missing enemy', () => {
    const state = makeState();
    state.activeRaid.combatTarget = null;
    const engine = createEngineContext(state);

    expect(() => engine.context.queryEnvironment({ kind: "isBleeding", entity: "enemy" })).toThrow(/no active combatTarget/);
  });
});
