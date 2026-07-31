import { GameState, ClassType } from "../types";
import { getWeaponStats, buildProceduralMap } from "../data";
import { createLog } from "./utils";
import { spawnEnemy } from "./spawning";
import { executeLootPhase, rollLootItem, getBackpackCapacity } from "./loot";
import { SECURE_CONTAINER_CAPACITY, sortLootIntoContainers } from "./lootManagement";
import { executeMaintenancePhase } from "./maintenance";
import { simulateCombatRound } from "./combat";
import { handleKIA, handleExtraction } from "./raidResolution";
import { createEngineContext } from "./engineContext";

/**
 * Executes a single simulation tick for the active raid.
 * Coordinates all sub-systems: Combat, Discovery, Looting, and Maintenance.
 * 
 * @param state The current global GameState
 * @returns A fresh GameState object representing the next simulation state
 */
export const runRaidTick = (state: GameState): GameState => {
  if (!state.activeRaid.isActive || !state.activeRaid.map) return state;

  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const engine = createEngineContext(newState);
  const context = engine.context;
  const raid = newState.activeRaid;
  const pmc = newState.pmc;
  const map = raid.map!;
  const equippedWeapon = newState.stash.weapons.find(w => w.id === newState.stash.equippedWeaponId) || newState.stash.weapons[0];
  const weaponStats = getWeaponStats(equippedWeapon, newState.hideout.workbench.level);

  // Time advancement
  raid.elapsedSeconds += 12 + Math.floor(Math.random() * 8);

  // Nutrition Decay
  const rateReduction = newState.hideout.nutritionUnit.level >= 3 ? 0.8 : 1.0;
  const enduranceLevel = pmc.skills.constitution.level;
  const skillReduction = Math.max(0.5, 1 - enduranceLevel * 0.015);
  const drainModifier = rateReduction * skillReduction;

  if (Math.random() < 0.25 * drainModifier) pmc.energy = Math.max(0, pmc.energy - 1);
  if (Math.random() < 0.30 * drainModifier) pmc.hydration = Math.max(0, pmc.hydration - 1);

  // Status update after decay
  const tileProgress = raid.tiles ? `${raid.currentStage + 1}/${raid.tiles.length}` : "?/?";
  raid.logs.push(createLog(`[STATUS] Hydration: ${pmc.hydration}/${pmc.maxHydration} | Energy: ${pmc.energy}/${pmc.maxEnergy} | Tile: ${tileProgress}`, "status", raid.elapsedSeconds));

  if (pmc.hydration <= 0) {
    pmc.bodyParts.head.current = 0;
    pmc.bodyParts.thorax.current = 0;
    raid.logs.push(createLog("PMC collapsed from fatal dehydration and died!", "death", raid.elapsedSeconds));
    raid.status = "kia";
  } else if (pmc.hydration < 25 && raid.status !== "combat") {
    if (Math.random() < 0.15) raid.logs.push(createLog("Player is severely dehydrated!", "warning", raid.elapsedSeconds));
  } else if (pmc.hydration < 50 && raid.status !== "combat") {
    if (Math.random() < 0.15) raid.logs.push(createLog("Player is thirsty", "warning", raid.elapsedSeconds));
  }

  // Dehydration KIA Handling
  if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
    handleKIA(newState, "dehydration");
    return newState;
  }

  // Combat State
  if (raid.status === "combat" && raid.combatTarget) {
    const enemy = raid.combatTarget;
    const combatLogs = simulateCombatRound(pmc, enemy, equippedWeapon, weaponStats, raid.elapsedSeconds, raid, newState.hideout.shootingRange.level, context);
    raid.logs.push(...combatLogs);

    if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
      handleKIA(newState, "combat");
      return newState;
    }

    if (enemy.isDead) {
      pmc.killsCount++;
      if (enemy.tier === "Scav") raid.killsByTier.Scav++;
      else if (enemy.tier === "PMC") raid.killsByTier.PMC++;
      else if (enemy.tier === "Boss") {
        raid.killsByTier.Boss++;
        raid.killsByTier[enemy.name] = (raid.killsByTier[enemy.name] || 0) + 1;
      }

      const targetXP = enemy.tier === "Boss" ? 80 : enemy.tier === "PMC" ? 45 : 20;
      context.emitIntent({ targetEntityId: "pmc", type: "XP", value: targetXP });
      raid.logs.push(createLog(`Neutralized target of tier ${enemy.tier}. Earned +${targetXP} XP.`, "info", raid.elapsedSeconds));

      const weaponSkill = pmc.skills.weaponSkill;
      weaponSkill.xp += 15;
      if (weaponSkill.xp >= weaponSkill.maxXp) {
        weaponSkill.level++;
        weaponSkill.xp -= weaponSkill.maxXp;
        raid.logs.push(createLog(`SKILL INCREASE: Weapon Skill reached Level ${weaponSkill.level}!`, "info", raid.elapsedSeconds));
      }

      const baseLootRolls = enemy.tier === "Boss" ? 3 : enemy.tier === "PMC" ? 2 : 1;
      const luckyBonus = pmc.classType === ClassType.LUCKY ? 1 : 0;
      const lootRollCount = baseLootRolls + luckyBonus;

      for (let i = 0; i < lootRollCount; i++) {
        const item = rollLootItem(map);
        const capacity = getBackpackCapacity(pmc.skills.constitution.level);
        const uniqueBackpackCount = raid.lootFound.reduce((acc, e) => acc + e.quantity, 0);

        if (uniqueBackpackCount < capacity) {
          const secureCap = SECURE_CONTAINER_CAPACITY(newState.hideout.intelligenceCenter.level);
          raid.lootFound.push({ item, quantity: 1 });

          const { lootFound, secureContainerSaved } = sortLootIntoContainers(
            [...raid.lootFound, ...raid.secureContainerSaved],
            secureCap
          );
          raid.lootFound = lootFound;
          raid.secureContainerSaved = secureContainerSaved;

          raid.logs.push(createLog(`Looted corpse: found ${item.name} (Value: ₽${item.value})`, "loot", raid.elapsedSeconds));
        } else {
          raid.logs.push(createLog(`Loot ${item.name} left behind — Backpack is full!`, "warning", raid.elapsedSeconds));
        }
      }

      if (raid.reinforcementsSpawnedThisTile < 3 && Math.random() < 0.30) {
        raid.reinforcementsSpawnedThisTile++;
        const nextReinforcement = spawnEnemy(map, pmc.level);
        raid.combatTarget = nextReinforcement;
        const armorStr = nextReinforcement.equippedArmor ? `${nextReinforcement.equippedArmor.name} (Class ${nextReinforcement.equippedArmor.armorClass})` : "None";
        raid.logs.push(createLog(`[REINFORCE] ${raid.reinforcementsSpawnedThisTile}/3 reinforcements on tile. ${nextReinforcement.name} (${nextReinforcement.tier}) Lv.${nextReinforcement.level} | Armor: ${armorStr} | Weapon: ${nextReinforcement.equippedWeapon.name}`, "warning", raid.elapsedSeconds));
      } else {
        raid.status = "scavenging";
        raid.combatTarget = null;
        pmc.isCovered = false;
        raid.reinforcementsSpawnedThisTile = 0;
        
        executeMaintenancePhase(pmc, raid, equippedWeapon);
        executeLootPhase(pmc, raid, map, newState.hideout.intelligenceCenter.level);

        context.emitIntent({ targetEntityId: "raid", type: "POSITION_CHANGE", value: { to: raid.currentStage + 1 } });
      }
    }
    return newState;
  }

  // Scouting/Exploration phase
  let currentTile = raid.tiles ? raid.tiles[raid.currentStage] : undefined;

  if (!currentTile) {
    if ((!raid.tiles || raid.tiles.length === 0) && raid.map) {
      raid.tiles = buildProceduralMap(raid.map);
      raid.currentStage = Math.min(raid.currentStage, raid.tiles.length - 1);
      if (raid.currentStage < 0) raid.currentStage = 0;
      currentTile = raid.tiles[raid.currentStage];
    }
  }

  if (!currentTile || currentTile.type === "extraction" || raid.currentStage >= raid.tiles.length) {
    handleExtraction(newState);
    return newState;
  }

  raid.logs.push(createLog(`Entered [${currentTile.name}]: ${currentTile.description}`, "info", raid.elapsedSeconds));

  const encounterRoll = Math.random();
  if (encounterRoll < 0.25) {
    const hostile = spawnEnemy(map, pmc.level);
    raid.combatTarget = hostile;
    raid.status = "combat";
    const armorStr = hostile.equippedArmor ? `${hostile.equippedArmor.name} (Class ${hostile.equippedArmor.armorClass})` : "None";
    raid.logs.push(createLog(`[ENCOUNTER] Spotted ${hostile.name} (${hostile.tier}) Lv.${hostile.level} in [${currentTile.name}] | Armor: ${armorStr} | Weapon: ${hostile.equippedWeapon.name}`, "warning", raid.elapsedSeconds));
  } else {
    executeLootPhase(pmc, raid, map, newState.hideout.intelligenceCenter.level);
    executeMaintenancePhase(pmc, raid, equippedWeapon);
    context.emitIntent({ targetEntityId: "raid", type: "POSITION_CHANGE", value: { to: raid.currentStage + 1 } });
  }

  return newState;
};
