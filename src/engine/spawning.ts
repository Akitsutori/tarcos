import { MapData, EnemyState, Weapon, GameItem, CharacterSkills } from "../types";
import { INITIAL_WEAPONS } from "../data/content/weapons";
import { calculateBodyParts } from "../data/construction";
import { ENEMY_SPAWN_PROFILES, LEVEL_STAT_SCALE, EnemyTier, LevelConfig, WeaponConfig, EquipmentConfig } from "../data/tuning/enemySpawning";

/**
 * Rolls an equipment table following the profile's roll structure.
 * The RNG call sequence mirrors the original inline rolls exactly:
 * gate check first (when present), then a coin flip, random index, or single item.
 */
const rollEquipment = (cfg: EquipmentConfig): GameItem | null => {
  if (cfg.gate !== undefined && !(Math.random() < cfg.gate)) return null;
  if (cfg.pick === "coin") return Math.random() < 0.5 ? cfg.pool[0] : cfg.pool[1];
  if (cfg.pick === "index") return cfg.pool[Math.floor(Math.random() * cfg.pool.length)];
  return cfg.pool[0];
};

/**
 * Deep-clones a rolled equipment item so combat never mutates the shared
 * ALL_ITEMS / profile templates (durability/bleed state must be per-enemy).
 * Mirrors the existing weapon clone pattern in spawnEnemy.
 */
const cloneEquipment = (item: GameItem | null): GameItem | null => {
  return item ? structuredClone(item) as GameItem : null;
};

/**
 * Resolves an enemy level from the profile's LevelConfig. Preserves each
 * mode's exact formula and RNG consumption (add: none, delta/subtract: one).
 */
const resolveLevel = (mode: LevelConfig, pmcLevel: number): number => {
  switch (mode.mode) {
    case "add":
      return Math.min(pmcLevel + mode.amount, mode.max);
    case "delta": {
      const roll = pmcLevel + (Math.floor(Math.random() * mode.rollRange) + mode.offset);
      return Math.max(mode.min, Math.min(mode.max, roll));
    }
    case "subtract": {
      const roll = pmcLevel - (Math.floor(Math.random() * mode.rollRange) + mode.offset);
      return Math.max(mode.min, roll);
    }
  }
};

/**
 * Rolls the enemy's weapon from the profile's WeaponConfig and returns a
 * fresh clone (weapon ammo/mag state must be per-enemy). RNG consumption
 * matches the original inline branches exactly per mode.
 */
const pickWeapon = (mode: WeaponConfig): Weapon => {
  const cloneWeapon = (w: Weapon) => structuredClone(w) as Weapon;
  switch (mode.mode) {
    case "pool":
      return cloneWeapon(INITIAL_WEAPONS[mode.pool[Math.floor(Math.random() * mode.pool.length)]]);
    case "choice":
      return Math.random() < mode.chance
        ? cloneWeapon(INITIAL_WEAPONS[mode.chosen])
        : cloneWeapon(INITIAL_WEAPONS[mode.fallback]);
    case "split":
      return Math.random() < mode.pistolChance
        ? cloneWeapon(mode.pistol)
        : cloneWeapon(INITIAL_WEAPONS[mode.pool[Math.floor(Math.random() * mode.pool.length)]]);
  }
};

const makeSkill = (id: string, name: string, level: number): CharacterSkills[keyof CharacterSkills] => ({
  id,
  name,
  description: "",
  level,
  xp: 0,
  maxXp: 100,
  bonusPerLevel: "",
});

/**
 * Builds the enemy's CharacterSkills from five already-rolled levels.
 */
const buildEnemySkills = (initiative: number, agility: number, weaponSkill: number, perception: number, constitution: number): CharacterSkills => ({
  weaponSkill: makeSkill("weaponSkill", "Weapon Skill", weaponSkill),
  constitution: makeSkill("constitution", "Constitution", constitution),
  perception: makeSkill("perception", "Perception", perception),
  initiative: makeSkill("initiative", "Initiative", initiative),
  agility: makeSkill("agility", "Agility", agility),
});

/**
 * Generates an enemy based on the map's difficulty and spawn chances.
 * Handles Boss, PMC, and Scav tiers, including their randomized stats and equipment.
 * All values are sourced from ENEMY_SPAWN_PROFILES (data/tuning/enemySpawning.ts).
 * The RNG call sequence per tier is preserved exactly (golden-parity).
 *
 * @param map The current map metadata
 * @param pmcLevel The player's current level (for level scaling)
 * @returns Fully constructed EnemyState object ready for combat
 */
export const spawnEnemy = (map: MapData, pmcLevel: number): EnemyState => {
  const rand = Math.random();
  const isBoss = rand < map.bossSpawnChance;
  const isPMC = !isBoss && rand < (map.bossSpawnChance + map.pmcSpawnChance);

  const profile = isBoss ? ENEMY_SPAWN_PROFILES.Boss : isPMC ? ENEMY_SPAWN_PROFILES.PMC : ENEMY_SPAWN_PROFILES.Scav;

  let tier: EnemyTier = "Scav";
  let name = "";
  if (isBoss) {
    tier = "Boss";
    name = map.bossName;
  } else {
    tier = isPMC ? "PMC" : "Scav";
    name = `${profile.names[Math.floor(Math.random() * profile.names.length)]} (${tier})`;
  }

  const level = resolveLevel(profile.level, pmcLevel);
  const equippedWeapon = pickWeapon(profile.weapon);

  // Boss/PMC clone rolled armor so combat never mutates the shared templates;
  // Scavs intentionally keep the original (reference) behavior.
  const isElite = isBoss || isPMC;
  const equippedArmor = isElite ? cloneEquipment(rollEquipment(profile.armor)) : rollEquipment(profile.armor);
  const equippedHelmet = isElite ? cloneEquipment(rollEquipment(profile.helmet)) : rollEquipment(profile.helmet);

  const baseAccuracy = profile.baseAccuracy;
  const { initiative: iRange, agility: aRange, weaponSkill: wRange, perception: pRange, constitution: cRange } = profile.statRanges;

  const getRandVal = (range: number[]) => Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const levelBonus = Math.floor((level - 1) * LEVEL_STAT_SCALE);

  const skills = buildEnemySkills(
    getRandVal(iRange) + levelBonus,
    getRandVal(aRange) + levelBonus,
    getRandVal(wRange) + levelBonus,
    getRandVal(pRange) + levelBonus,
    getRandVal(cRange) + levelBonus,
  );

  return {
    name,
    tier,
    level,
    bodyParts: calculateBodyParts(skills.constitution.level),
    skills,
    baseAccuracy,
    equippedWeapon,
    equippedArmor,
    equippedHelmet,
    isBleeding: false,
    isCovered: false,
    isDead: false
  };
};
