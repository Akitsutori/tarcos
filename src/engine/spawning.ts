import { MapData, EnemyState, Weapon, GameItem, PMCBodyParts, CharacterSkills, ClassType } from "../types";
import { INITIAL_WEAPONS, ALL_ITEMS, calculateBodyParts } from "../data";

/**
 * Generates an enemy based on the map's difficulty and spawn chances.
 * Handles Boss, PMC, and Scav tiers, including their randomized stats and equipment.
 *
 * @param map The current map metadata
 * @param pmcLevel The player's current level (for level scaling)
 * @returns Fully constructed EnemyState object ready for combat
 */
export const spawnEnemy = (map: MapData, pmcLevel: number): EnemyState => {
  const rand = Math.random();
  const isBoss = rand < map.bossSpawnChance;
  const isPMC = !isBoss && rand < (map.bossSpawnChance + map.pmcSpawnChance);

  let name = "";
  let tier: "Scav" | "PMC" | "Boss" = "Scav";
  let level = 1;
  let initiativeRange = [8, 12];
  let agilityRange = [7, 11];
  let weaponSkillRange = [1, 5];
  let perceptionRange = [7, 11];
  let constitutionRange = [2, 5];
  let baseAccuracy = 30;

  let equippedWeapon: Weapon;
  let equippedArmor: GameItem | null = null;
  let equippedHelmet: GameItem | null = null;

  if (isBoss) {
    tier = "Boss";
    name = map.bossName;
    level = pmcLevel + 5;
    if (level > 65) level = 65;
    initiativeRange = [13, 17];
    agilityRange = [11, 15];
    weaponSkillRange = [15, 20];
    perceptionRange = [11, 14];
    constitutionRange = [6, 9];
    baseAccuracy = 40;

    const bossWeapons = [ClassType.SOLDIER, ClassType.MARKSMAN, ClassType.LUCKY];
    const chosenW = bossWeapons[Math.floor(Math.random() * bossWeapons.length)];
    equippedWeapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[chosenW])) as Weapon;

    equippedArmor = Math.random() < 0.5 ? JSON.parse(JSON.stringify(ALL_ITEMS.armor_killa)) : JSON.parse(JSON.stringify(ALL_ITEMS.armor_glukhar));
    equippedHelmet = Math.random() < 0.5 ? JSON.parse(JSON.stringify(ALL_ITEMS.altyn)) : JSON.parse(JSON.stringify(ALL_ITEMS.helmet_6b47));
  } else if (isPMC) {
    tier = "PMC";
    const pmcNames = ["Ghost", "Hammer", "Viking", "Frost", "Viper", "Raven", "Slayer", "Sherpa", "DormChad"];
    name = `${pmcNames[Math.floor(Math.random() * pmcNames.length)]} (PMC)`;
    level = pmcLevel + Math.floor(Math.random() * 11) - 5;
    if (level < 1) level = 1;
    if (level > 60) level = 60;
    initiativeRange = [10, 14];
    agilityRange = [9, 13];
    weaponSkillRange = [11, 16];
    perceptionRange = [9, 12];
    constitutionRange = [4, 7];
    baseAccuracy = 30;

    const isLmg = Math.random() < 0.25;
    equippedWeapon = isLmg 
      ? JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.LUCKY])) 
      : JSON.parse(JSON.stringify(INITIAL_WEAPONS[ClassType.SOLDIER]));

    if (Math.random() < 0.70) {
      equippedArmor = Math.random() < 0.5 ? JSON.parse(JSON.stringify(ALL_ITEMS.armor_6b13)) : JSON.parse(JSON.stringify(ALL_ITEMS.armor_6b13_heavy));
    }
    if (Math.random() < 0.60) {
      const helmets = [ALL_ITEMS.helmet_6b47, ALL_ITEMS.ulach, ALL_ITEMS.fast_mt, ALL_ITEMS.tor_team];
      equippedHelmet = JSON.parse(JSON.stringify(helmets[Math.floor(Math.random() * helmets.length)])) as GameItem;
    }
  } else {
    tier = "Scav";
    const scavNames = ["Bomzh", "Gopnik", "Tushonka", "Ded", "Cheeki", "Breeki", "Serega", "Kolya", "Morozov"];
    name = `${scavNames[Math.floor(Math.random() * scavNames.length)]} (Scav)`;
    level = pmcLevel - (Math.floor(Math.random() * 11) + 5);
    if (level < 1) level = 1;
    initiativeRange = [8, 12];
    agilityRange = [7, 11];
    weaponSkillRange = [1, 5];
    perceptionRange = [7, 11];
    constitutionRange = [2, 5];
    baseAccuracy = 30;

    const rollWeapon = Math.random();
    let classWeapon = ClassType.SOLDIER;
    if (rollWeapon < 0.50) {
      equippedWeapon = {
        id: "pistol",
        name: "Pistol (9x18mm)",
        baseErgo: 40,
        baseRecoil: 50,
        baseDmg: 25,
        baseAccuracy: 40,
        mods: {},
        signatureClass: ClassType.LUCKY,
        caliber: "9x18mm",
        currentMagRounds: 8,
        maxMagSize: 8,
        reserveMags: 2,
        maxReserveMags: 2
      };
    } else {
      const scavWeapons = [ClassType.SURVIVOR, ClassType.SCOUT, ClassType.SOLDIER];
      classWeapon = scavWeapons[Math.floor(Math.random() * scavWeapons.length)];
      equippedWeapon = JSON.parse(JSON.stringify(INITIAL_WEAPONS[classWeapon])) as Weapon;
    }

    if (Math.random() < 0.40) {
      equippedArmor = JSON.parse(JSON.stringify(ALL_ITEMS.paca));
    }
    if (Math.random() < 0.20) {
      equippedHelmet = Math.random() < 0.5 ? JSON.parse(JSON.stringify(ALL_ITEMS.untar)) : JSON.parse(JSON.stringify(ALL_ITEMS.ssh68));
    }
  }

  const getRandVal = (range: number[]) => Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

  const rollInit = getRandVal(initiativeRange);
  const rollAgil = getRandVal(agilityRange);
  const rollWeap = getRandVal(weaponSkillRange);
  const rollPerc = getRandVal(perceptionRange);
  const rollConst = getRandVal(constitutionRange);

  const levelBonus = Math.floor((level - 1) * 0.15);

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
