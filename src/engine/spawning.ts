import { MapData, EnemyState, Weapon, GameItem, PMCBodyParts, CharacterSkills, ClassType } from "../types";
import { INITIAL_WEAPONS, calculateBodyParts } from "../data";
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
 * Generates an enemy based on the map's difficulty and spawn chances.
 * Handles Boss, PMC, and Scav tiers, including their randomized stats and equipment.
 * All values are sourced from ENEMY_SPAWN_PROFILES (data/tuning/enemySpawning.ts).
 *
 * @param map The current map metadata
 * @param pmcLevel The player's current level (for level scaling)
 * @returns Fully constructed EnemyState object ready for combat
 */
export const spawnEnemy = (map: MapData, pmcLevel: number): EnemyState => {
  const rand = Math.random();
  const isBoss = rand < map.bossSpawnChance;
  const isPMC = !isBoss && rand < (map.bossSpawnChance + map.pmcSpawnChance);

  let tier: EnemyTier = "Scav";
  let name = "";
  let level = 1;
  let equippedWeapon: Weapon;
  let equippedArmor: GameItem | null = null;
  let equippedHelmet: GameItem | null = null;

  if (isBoss) {
    const profile = ENEMY_SPAWN_PROFILES.Boss;
    tier = "Boss";
    name = map.bossName;
    const lvl = profile.level as Extract<LevelConfig, { mode: "add" }>;
    level = Math.min(pmcLevel + lvl.amount, lvl.max);

    const wpn = profile.weapon as Extract<WeaponConfig, { mode: "pool" }>;
    const chosenW = wpn.pool[Math.floor(Math.random() * wpn.pool.length)];
    equippedWeapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[chosenW])) as Weapon;

    equippedArmor = rollEquipment(profile.armor);
    equippedHelmet = rollEquipment(profile.helmet);
  } else if (isPMC) {
    const profile = ENEMY_SPAWN_PROFILES.PMC;
    tier = "PMC";
    name = `${profile.names[Math.floor(Math.random() * profile.names.length)]} (PMC)`;

    const lvl = profile.level as Extract<LevelConfig, { mode: "delta" }>;
    level = pmcLevel + (Math.floor(Math.random() * lvl.rollRange) + lvl.offset);
    if (level < lvl.min) level = lvl.min;
    if (level > lvl.max) level = lvl.max;

    const wpn = profile.weapon as Extract<WeaponConfig, { mode: "choice" }>;
    const isLmg = Math.random() < wpn.chance;
    equippedWeapon = isLmg
      ? JSON.parse(JSON.stringify(INITIAL_WEAPONS[wpn.chosen])) as Weapon
      : JSON.parse(JSON.stringify(INITIAL_WEAPONS[wpn.fallback])) as Weapon;

    equippedArmor = rollEquipment(profile.armor);
    equippedHelmet = rollEquipment(profile.helmet);
  } else {
    const profile = ENEMY_SPAWN_PROFILES.Scav;
    tier = "Scav";
    name = `${profile.names[Math.floor(Math.random() * profile.names.length)]} (Scav)`;

    const lvl = profile.level as Extract<LevelConfig, { mode: "subtract" }>;
    level = pmcLevel - (Math.floor(Math.random() * lvl.rollRange) + lvl.offset);
    if (level < lvl.min) level = lvl.min;

    const wpn = profile.weapon as Extract<WeaponConfig, { mode: "split" }>;
    const rollWeapon = Math.random();
    if (rollWeapon < wpn.pistolChance) {
      equippedWeapon = JSON.parse(JSON.stringify(wpn.pistol)) as Weapon;
    } else {
      const classWeapon = wpn.pool[Math.floor(Math.random() * wpn.pool.length)];
      equippedWeapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[classWeapon])) as Weapon;
    }

    equippedArmor = rollEquipment(profile.armor);
    equippedHelmet = rollEquipment(profile.helmet);
  }

  const profile = isBoss ? ENEMY_SPAWN_PROFILES.Boss : isPMC ? ENEMY_SPAWN_PROFILES.PMC : ENEMY_SPAWN_PROFILES.Scav;
  const baseAccuracy = profile.baseAccuracy;
  const { initiative: initiativeRange, agility: agilityRange, weaponSkill: weaponSkillRange, perception: perceptionRange, constitution: constitutionRange } = profile.statRanges;

  const getRandVal = (range: number[]) => Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

  const rollInit = getRandVal(initiativeRange);
  const rollAgil = getRandVal(agilityRange);
  const rollWeap = getRandVal(weaponSkillRange);
  const rollPerc = getRandVal(perceptionRange);
  const rollConst = getRandVal(constitutionRange);

  const levelBonus = Math.floor((level - 1) * LEVEL_STAT_SCALE);

  const finalInit = rollInit + levelBonus;
  const finalAgil = rollAgil + levelBonus;
  const finalWeap = rollWeap + levelBonus;
  const finalPerc = rollPerc + levelBonus;
  const finalConst = rollConst + levelBonus;

  const skills: CharacterSkills = {
    weaponSkill: { id: "weaponSkill", name: "Weapon Skill", description: "", level: finalWeap, xp: 0, maxXp: 100, bonusPerLevel: "" },
    constitution: { id: "constitution", name: "Constitution", description: "", level: finalConst, xp: 0, maxXp: 100, bonusPerLevel: "" },
    perception: { id: "perception", name: "Perception", description: "", level: finalPerc, xp: 0, maxXp: 100, bonusPerLevel: "" },
    initiative: { id: "initiative", name: "Initiative", description: "", level: finalInit, xp: 0, maxXp: 100, bonusPerLevel: "" },
    agility: { id: "agility", name: "Agility", description: "", level: finalAgil, xp: 0, maxXp: 100, bonusPerLevel: "" }
  };

  const bodyParts = calculateBodyParts(finalConst);

  return {
    name,
    tier,
    level,
    bodyParts,
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
