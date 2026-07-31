import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runRaidTick } from './raidSimulation';
import { createInitialPMC, createInitialHideout, ALL_MAPS, ALL_ITEMS } from '../data';
import {
  ClassType, GameState, RaidState, Stash, Weapon, EnemyState, GameItem,
  PMCBodyParts, CharacterSkills, Skill, RoomTile
} from '../types';

const makeItem = (id: string, value: number): GameItem => ({
  id,
  name: id,
  description: "",
  type: "valuable",
  rarity: "common",
  value,
  iconName: "gem",
});

const makeSkill = (id: string, name: string, level = 1): Skill => ({
  id,
  name,
  description: "",
  level,
  xp: 0,
  maxXp: 100,
  bonusPerLevel: "",
});

const makePmcSkills = (): CharacterSkills => ({
  weaponSkill: makeSkill("weaponSkill", "Weapon Skill"),
  constitution: makeSkill("constitution", "Constitution"),
  perception: makeSkill("perception", "Perception"),
  initiative: makeSkill("initiative", "Initiative"),
  agility: makeSkill("agility", "Agility"),
});

const makeFullBodyParts = (): PMCBodyParts => ({
  head: { id: "head", name: "Head", current: 35, max: 35 },
  thorax: { id: "thorax", name: "Thorax", current: 85, max: 85 },
  stomach: { id: "stomach", name: "Stomach", current: 70, max: 70 },
  leftArm: { id: "leftArm", name: "Left Arm", current: 60, max: 60 },
  rightArm: { id: "rightArm", name: "Right Arm", current: 60, max: 60 },
  leftLeg: { id: "leftLeg", name: "Left Leg", current: 65, max: 65 },
  rightLeg: { id: "rightLeg", name: "Right Leg", current: 65, max: 65 },
});

const makeNearDeathBodyParts = (): PMCBodyParts => ({
  head: { id: "head", name: "Head", current: 1, max: 35 },
  thorax: { id: "thorax", name: "Thorax", current: 1, max: 85 },
  stomach: { id: "stomach", name: "Stomach", current: 1, max: 70 },
  leftArm: { id: "leftArm", name: "Left Arm", current: 1, max: 60 },
  rightArm: { id: "rightArm", name: "Right Arm", current: 1, max: 60 },
  leftLeg: { id: "leftLeg", name: "Left Leg", current: 1, max: 65 },
  rightLeg: { id: "rightLeg", name: "Right Leg", current: 1, max: 65 },
});

const makeWeapon = (id: string, magRounds: number, reserves: number): Weapon => ({
  id,
  name: "Test Weapon (7.62x39mm)",
  baseErgo: 50,
  baseRecoil: 85,
  baseDmg: 50,
  baseAccuracy: 50,
  mods: {},
  signatureClass: ClassType.SOLDIER,
  caliber: "7.62x39mm",
  currentMagRounds: magRounds,
  maxMagSize: 30,
  reserveMags: reserves,
  maxReserveMags: 3,
});

const makeEnemy = (): EnemyState => ({
  name: "Test Scav",
  tier: "Scav",
  level: 1,
  bodyParts: makeFullBodyParts(),
  skills: makePmcSkills(),
  baseAccuracy: 30,
  equippedWeapon: makeWeapon("enemy_weapon", 30, 3),
  equippedArmor: null,
  equippedHelmet: null,
  isBleeding: false,
  isCovered: false,
  isDead: false,
});

const makeGameState = (): GameState => {
  const pmc = createInitialPMC(ClassType.SOLDIER);
  pmc.level = 1;
  pmc.xp = 0;
  pmc.maxXp = 1000;
  pmc.energy = 100;
  pmc.maxEnergy = 100;
  pmc.hydration = 100;
  pmc.maxHydration = 100;
  pmc.skills = makePmcSkills();
  pmc.bodyParts = makeFullBodyParts();
  pmc.equippedArmor = null;
  pmc.equippedHelmet = null;
  pmc.equippedMedkit = null;
  pmc.equippedSurgicalKit = null;
  pmc.equippedProvision = null;
  pmc.isBleeding = false;
  pmc.isCovered = false;
  pmc.isDead = false;
  pmc.survivalRate = 0;
  pmc.raidsCount = 3;
  pmc.survivedCount = 2;
  pmc.kiaCount = 1;
  pmc.killsCount = 0;

  const stash: Stash = {
    items: [
      { item: makeItem("existing_item", 100), quantity: 2 },
    ],
    roubles: 0,
    weapons: [makeWeapon("equipped_weapon", 0, 0)],
    equippedWeaponId: "equipped_weapon",
  };

  const raid: RaidState = {
    isActive: true,
    map: ALL_MAPS[0],
    tiles: [],
    currentStage: 0,
    status: "scavenging",
    combatTarget: null,
    logs: [],
    lootFound: [],
    secureContainerSaved: [],
    elapsedSeconds: 0,
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

let randomQueue: number[];

const stubMathRandom = (queue: number[]) => {
  randomQueue = queue;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = randomQueue.shift();
    return value !== undefined ? value : 0.5;
  });
};

describe('Raid Resolution Characterization (current runRaidTick behavior)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dehydration KIA: collapses PMC and runs the death pipeline', () => {
    const state = makeGameState();
    state.pmc.hydration = 0;
    state.activeRaid.secureContainerSaved = [
      { item: makeItem("secure_item", 500), quantity: 1 },
      { item: makeItem("existing_item", 100), quantity: 3 },
    ];

    stubMathRandom([0, 0, 0]);
    const result = runRaidTick(state);

    const raid = result.activeRaid;
    expect(raid.status).toBe("kia");
    expect(raid.isActive).toBe(false);
    expect(result.pmc.kiaCount).toBe(2);
    expect(result.pmc.raidsCount).toBe(4);
    expect(result.pastRaidOutcomes).toEqual(["kia"]);
    expect(result.pmc.survivalRate).toBe(50);
    expect(result.stash.items.find(i => i.item.id === "secure_item")?.quantity).toBe(1);
    expect(result.stash.items.find(i => i.item.id === "existing_item")?.quantity).toBe(5);
    expect(result.pmc.xp).toBe(0);
    expect(result.pmc.skills.perception.xp).toBe(25);
    expect(raid.logs.some(l => l.message.includes("PMC collapsed from fatal dehydration"))).toBe(true);
    expect(raid.logs.some(l => l.message.includes("PMC KIA from dehydration/starvation"))).toBe(true);
  });

  it('dehydration KIA: level-up loop awards skill from ARCHETYPE_WEIGHTS when xp threshold is met', () => {
    const state = makeGameState();
    state.pmc.hydration = 0;
    state.pmc.xp = 100;
    state.pmc.maxXp = 100;

    stubMathRandom([0, 0, 0, 0, 0, 0, 0, 0.1]);
    const result = runRaidTick(state);

    expect(result.pmc.level).toBe(2);
    expect(result.pmc.xp).toBe(0);
    expect(result.pmc.maxXp).toBe(400);
    expect(result.pmc.skills.weaponSkill.level).toBe(2);
    expect(result.activeRaid.logs.some(l => l.message.includes("PMC LEVELED UP"))).toBe(true);
    expect(result.activeRaid.logs.some(l => l.message.includes("Skill Award"))).toBe(true);
  });

  it('combat KIA: fatal head shot runs the combat death pipeline', () => {
    const state = makeGameState();
    state.activeRaid.status = "combat";
    state.activeRaid.combatTarget = makeEnemy();
    state.pmc.bodyParts = makeNearDeathBodyParts();
    state.activeRaid.secureContainerSaved = [
      { item: makeItem("secure_item", 500), quantity: 1 },
    ];

    stubMathRandom([0, 0, 0, 0, 0, 0.5, 0, 0, 0.5, 0.1, 0, 0, 0.05, 0.05, 0.1, 0, 0, 0]);
    const result = runRaidTick(state);

    const raid = result.activeRaid;
    expect(raid.status).toBe("kia");
    expect(raid.isActive).toBe(false);
    expect(result.pmc.kiaCount).toBe(2);
    expect(result.pmc.raidsCount).toBe(4);
    expect(result.pastRaidOutcomes).toEqual(["kia"]);
    expect(result.pmc.survivalRate).toBe(50);
    expect(result.stash.items.find(i => i.item.id === "secure_item")?.quantity).toBe(1);
    expect(result.pmc.skills.perception.xp).toBe(25);
    expect(raid.logs.some(l => l.message.includes("PMC KIA in combat"))).toBe(true);
  });

  it('extraction: moves loot to stash, restores equipment durability, refills quests', () => {
    const state = makeGameState();
    state.activeRaid.status = "scavenging";
    state.activeRaid.tiles = [{ name: "Exit", description: "Extraction point", type: "extraction" } as RoomTile];
    state.activeRaid.lootFound = [
      { item: makeItem("new_loot", 300), quantity: 1 },
      { item: makeItem("existing_item", 100), quantity: 2 },
    ];
    state.activeRaid.secureContainerSaved = [
      { item: makeItem("secure_item", 500), quantity: 2 },
    ];
    state.pmc.equippedArmor = { ...ALL_ITEMS.armor_6b13, durability: 5 };
    state.pmc.equippedHelmet = { ...ALL_ITEMS.ssh68, durability: 3 };

    stubMathRandom([0, 0, 0]);
    const result = runRaidTick(state);

    const raid = result.activeRaid;
    expect(raid.status).toBe("extracted");
    expect(raid.isActive).toBe(false);
    expect(result.pmc.survivedCount).toBe(3);
    expect(result.pmc.raidsCount).toBe(4);
    expect(result.pastRaidOutcomes).toEqual(["extracted"]);
    expect(result.pmc.survivalRate).toBe(75);
    expect(result.pmc.xp).toBe(62);
    expect(result.stash.items.find(i => i.item.id === "new_loot")?.quantity).toBe(1);
    expect(result.stash.items.find(i => i.item.id === "secure_item")?.quantity).toBe(2);
    expect(result.stash.items.find(i => i.item.id === "existing_item")?.quantity).toBe(4);
    expect(result.pmc.equippedArmor?.durability).toBe(result.pmc.equippedArmor?.maxDurability);
    expect(result.pmc.equippedHelmet?.durability).toBe(result.pmc.equippedHelmet?.maxDurability);
    expect(result.activeQuests.length).toBe(5);
    expect(result.activeQuests.every(q => !q.completed)).toBe(true);
    expect(result.pmc.skills.perception.xp).toBe(25);
    expect(raid.logs.some(l => l.message.includes("PMC extracted successfully"))).toBe(true);
  });
});
