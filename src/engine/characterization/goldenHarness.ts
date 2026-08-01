import { vi } from 'vitest';
import { GameState, ClassType, RaidState, Stash, Weapon, EnemyState, GameItem, PMCBodyParts, RaidLog, Skill, CharacterSkills } from '../../types';
import { ALL_MAPS } from '../../data/content/maps';
import { INITIAL_WEAPONS } from '../../data/content/weapons';
import { createInitialPMC, createInitialHideout } from '../../data/construction';
import { runRaidTick } from '../raidSimulation';
import { BODY_PART_ORDER } from '../bodyParts';

/**
 * Golden Master test harness.
 *
 * Makes the engine byte-deterministic by driving Math.random() through a
 * seeded mulberry32 PRNG, then records a compact, stable transcript of every
 * runRaidTick. Scenarios are frozen as committed JSON golden files and act as
 * the regression contract for tick behavior: any intentional change MUST be
 * justified and re-baselined with `vitest run -u`.
 */

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const installSeed = (seed: number) => {
  const rng = mulberry32(seed);
  return vi.spyOn(Math, 'random').mockImplementation(() => rng());
};

// ---------------------------------------------------------------------------
// Fixtures (self-contained so existing green tests stay untouched)
// ---------------------------------------------------------------------------

const makeSkill = (id: string, name: string, level = 1): Skill => ({
  id,
  name,
  description: "",
  level,
  xp: 0,
  maxXp: 100,
  bonusPerLevel: "",
});

const makeSkills = (): CharacterSkills => ({
  weaponSkill: makeSkill("weaponSkill", "Weapon Skill"),
  constitution: makeSkill("constitution", "Constitution"),
  perception: makeSkill("perception", "Perception"),
  initiative: makeSkill("initiative", "Initiative"),
  agility: makeSkill("agility", "Agility"),
});

const makeBodyParts = (): PMCBodyParts => ({
  head: { id: "head", name: "Head", current: 35, max: 35 },
  thorax: { id: "thorax", name: "Thorax", current: 85, max: 85 },
  stomach: { id: "stomach", name: "Stomach", current: 70, max: 70 },
  leftArm: { id: "leftArm", name: "Left Arm", current: 60, max: 60 },
  rightArm: { id: "rightArm", name: "Right Arm", current: 60, max: 60 },
  leftLeg: { id: "leftLeg", name: "Left Leg", current: 65, max: 65 },
  rightLeg: { id: "rightLeg", name: "Right Leg", current: 65, max: 65 },
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

export const makeEnemy = (): EnemyState => ({
  name: "Test Scav",
  tier: "Scav",
  level: 1,
  bodyParts: makeBodyParts(),
  skills: makeSkills(),
  baseAccuracy: 30,
  equippedWeapon: makeWeapon("enemy_weapon", 30, 3),
  equippedArmor: null,
  equippedHelmet: null,
  isBleeding: false,
  isCovered: false,
  isDead: false,
});

/**
 * Builds a realistic fresh-deploy state: brand-new SOLDIER PMC (starting
 * skills distributed through the seeded RNG), loaded assault rifle in the
 * stash, default hideout, empty active quests. `configure` may mutate the
 * state to set up a scenario (combat target, hydration level, etc.).
 */
export const makeGoldenState = (): GameState => {
  const pmc = createInitialPMC(ClassType.SOLDIER);

  const stash: Stash = {
    items: [],
    roubles: 0,
    weapons: [JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER])) as Weapon],
    equippedWeaponId: INITIAL_WEAPONS[ClassType.SOLDIER].id,
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

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

const bodyHp = (bp: PMCBodyParts) => BODY_PART_ORDER.map(k => bp[k].current);

const enemySnapshot = (enemy: EnemyState) => ({
  name: enemy.name,
  tier: enemy.tier,
  level: enemy.level,
  isDead: enemy.isDead,
  isBleeding: enemy.isBleeding,
  hp: bodyHp(enemy.bodyParts),
});

const itemList = (entries: { item: GameItem; quantity: number }[]) => entries.map(e => `${e.item.id}x${e.quantity}`);

const durability = (item: GameItem | null): string | null => {
  if (!item) return null;
  if (item.durability !== undefined && item.maxDurability !== undefined) {
    return `${item.id}:${item.durability}/${item.maxDurability}`;
  }
  return `${item.id}:${item.resourceCurrent ?? 0}/${item.resourceMax ?? 0}`;
};

const buildTickLine = (state: GameState, tick: number, newLogs: RaidLog[]) => {
  const { pmc, stash, activeRaid: raid } = state;
  const weapon = stash.weapons.find(w => w.id === stash.equippedWeaponId) ?? stash.weapons[0];
  return {
    tick,
    elapsedSeconds: raid.elapsedSeconds,
    stage: raid.currentStage,
    status: raid.status,
    killsByTier: raid.killsByTier,
    pmc: {
      level: pmc.level,
      xp: pmc.xp,
      energy: pmc.energy,
      hydration: pmc.hydration,
      hp: bodyHp(pmc.bodyParts),
      isBleeding: pmc.isBleeding,
      killsCount: pmc.killsCount,
      medkit: durability(pmc.equippedMedkit),
      surgicalKit: durability(pmc.equippedSurgicalKit),
      provision: durability(pmc.equippedProvision),
      armor: durability(pmc.equippedArmor),
      helmet: durability(pmc.equippedHelmet),
      weaponRounds: weapon ? `${weapon.currentMagRounds}/${weapon.maxMagSize}+${weapon.reserveMags}` : null,
    },
    combatTarget: raid.combatTarget ? enemySnapshot(raid.combatTarget) : null,
    lootFound: itemList(raid.lootFound),
    secureContainerSaved: itemList(raid.secureContainerSaved),
    stashItems: itemList(stash.items),
    logs: newLogs.map(l => ({ t: l.type, m: l.message })),
  };
};

// ---------------------------------------------------------------------------
// Scenario runner
// ---------------------------------------------------------------------------

export interface ScenarioResult {
  transcript: string;
  ticks: number;
  finalStatus: RaidState["status"];
}

/**
 * Runs runRaidTick from a golden state (after `configure` mutation) until the
 * raid becomes inactive or maxTicks elapses, producing a deterministic JSON
 * transcript. The seed is installed BEFORE the state is constructed so that
 * createInitialPMC's skill distribution is also deterministic.
 */
export const runScenario = (
  seed: number,
  configure: (state: GameState) => void,
  maxTicks = 300,
): ScenarioResult => {
  const spy = installSeed(seed);
  try {
    let state = makeGoldenState();
    configure(state);

    const lines: unknown[] = [];
    let ticks = 0;

    while (ticks < maxTicks) {
      const logCountBefore = state.activeRaid.logs.length;
      const next = runRaidTick(state);
      state = next;
      const newLogs = next.activeRaid.logs.slice(logCountBefore);

      ticks++;
      lines.push(buildTickLine(next, ticks, newLogs));

      if (!next.activeRaid.isActive) break;
    }

    return {
      transcript: JSON.stringify(lines, null, 2) + "\n",
      ticks,
      finalStatus: state.activeRaid.status,
    };
  } finally {
    spy.mockRestore();
  }
};
