import { GameState } from "../types";
import { createDraft, finishDraft } from "immer";
import { getWeaponStats, buildProceduralMap } from "../data";
import { createLog } from "./utils";
import { spawnEnemy } from "./spawning";
import { executeLootPhase, rollLootItem, getBackpackCapacity } from "./loot";
import { SECURE_CONTAINER_CAPACITY, sortLootIntoContainers } from "./lootManagement";
import { executeMaintenancePhase } from "./maintenance";
import { simulateCombatRoundGenerator } from "./combat";
import { handleKIA, handleExtraction } from "./raidResolution";
import { createEngineContext } from "./engineContext";
import { InterruptHook } from "./types";
import { TICK_SECONDS_MIN, TICK_SECONDS_MAX, ENERGY_DECAY_CHANCE, HYDRATION_DECAY_CHANCE, NUTRITION_UNIT_DECAY_RATE, SKILL_DECAY_REDUCTION_PER_LEVEL, SKILL_DECAY_REDUCTION_MIN, HYDRATION_STATUS, STATUS_WARNING_CHANCE } from "../data/tuning/raidConfig";
import { ENCOUNTER_CHANCE, REINFORCEMENT_MAX_PER_TILE, REINFORCEMENT_CHANCE } from "../data/tuning/enemySpawning";
import { getLuckyLootRolls } from "./behaviors/classPassives";

/**
 * Executes a single simulation tick for the active raid as a synchronous
 * generator. Yields `InterruptHook`s for observable sub-phase boundaries:
 * combat hooks are forwarded from `simulateCombatRoundGenerator`, and an
 * `AFTER_RAID_END` hook is emitted whenever the tick resolves the raid
 * (KIA / extraction). Yield points consume no RNG and mutate no state, so
 * draining the generator and taking its return value reproduces the original
 * synchronous tick byte-for-byte.
 *
 * The tick mutates an Immer draft (`createDraft`) of the input state: the
 * input is never modified, and `finishDraft` returns a fresh state reference
 * built with structural sharing (no per-tick full-tree clone) and frozen by
 * Immer's autoFreeze. Settlement is atomic at the finishDraft boundary.
 *
 * @param state The current global GameState
 * @returns A fresh GameState object representing the next simulation state
 */
export const runRaidTickGenerator = function* (state: GameState): Generator<InterruptHook, GameState, unknown> {
  if (!state.activeRaid.isActive || !state.activeRaid.map) return state;

  const newState = createDraft(state);
  const engine = createEngineContext(newState);
  const context = engine.context;
  const raid = newState.activeRaid;
  const pmc = newState.pmc;
  const map = raid.map!;
  const equippedWeapon = newState.stash.weapons.find(w => w.id === newState.stash.equippedWeaponId) || newState.stash.weapons[0];
  const weaponStats = getWeaponStats(equippedWeapon, newState.hideout.workbench.level);

  // Time advancement
  raid.elapsedSeconds += TICK_SECONDS_MIN + Math.floor(Math.random() * TICK_SECONDS_MAX);

  // Nutrition Decay
  const rateReduction = newState.hideout.nutritionUnit.level >= 3 ? NUTRITION_UNIT_DECAY_RATE : 1.0;
  const enduranceLevel = pmc.skills.constitution.level;
  const skillReduction = Math.max(SKILL_DECAY_REDUCTION_MIN, 1 - enduranceLevel * SKILL_DECAY_REDUCTION_PER_LEVEL);
  const drainModifier = rateReduction * skillReduction;

  if (Math.random() < ENERGY_DECAY_CHANCE * drainModifier) pmc.energy = Math.max(0, pmc.energy - 1);
  if (Math.random() < HYDRATION_DECAY_CHANCE * drainModifier) pmc.hydration = Math.max(0, pmc.hydration - 1);

  // Status update after decay
  const tileProgress = raid.tiles ? `${raid.currentStage + 1}/${raid.tiles.length}` : "?/?";
  raid.logs.push(createLog(`[STATUS] Hydration: ${pmc.hydration}/${pmc.maxHydration} | Energy: ${pmc.energy}/${pmc.maxEnergy} | Tile: ${tileProgress}`, "status", raid.elapsedSeconds));

  if (pmc.hydration <= HYDRATION_STATUS.FATAL) {
    pmc.bodyParts.head.current = 0;
    pmc.bodyParts.thorax.current = 0;
    raid.logs.push(createLog("PMC collapsed from fatal dehydration and died!", "death", raid.elapsedSeconds));
    raid.status = "kia";
  } else if (pmc.hydration < HYDRATION_STATUS.SEVERE && raid.status !== "combat") {
    if (Math.random() < STATUS_WARNING_CHANCE) raid.logs.push(createLog("Player is severely dehydrated!", "warning", raid.elapsedSeconds));
  } else if (pmc.hydration < HYDRATION_STATUS.THIRSTY && raid.status !== "combat") {
    if (Math.random() < STATUS_WARNING_CHANCE) raid.logs.push(createLog("Player is thirsty", "warning", raid.elapsedSeconds));
  }

  // Dehydration KIA Handling
  if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
    handleKIA(newState, "dehydration");
    yield { sourceEntityId: "raid", hookType: "AFTER_RAID_END", metadata: { status: raid.status } };
    return finishDraft(newState);
  }

  // Combat State
  if (raid.status === "combat" && raid.combatTarget) {
    const enemy = raid.combatTarget;
    const combatLogs = yield* simulateCombatRoundGenerator(pmc, enemy, equippedWeapon, weaponStats, raid.elapsedSeconds, raid, newState.hideout.shootingRange.level, context);
    raid.logs.push(...combatLogs);

    if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
      handleKIA(newState, "combat");
      yield { sourceEntityId: "raid", hookType: "AFTER_RAID_END", metadata: { status: raid.status } };
      return finishDraft(newState);
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
      const luckyBonus = getLuckyLootRolls(pmc.classType);
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

      if (raid.reinforcementsSpawnedThisTile < REINFORCEMENT_MAX_PER_TILE && Math.random() < REINFORCEMENT_CHANCE) {
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
    return finishDraft(newState);
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
    yield { sourceEntityId: "raid", hookType: "AFTER_RAID_END", metadata: { status: raid.status } };
    return finishDraft(newState);
  }

  raid.logs.push(createLog(`Entered [${currentTile.name}]: ${currentTile.description}`, "info", raid.elapsedSeconds));

  const encounterRoll = Math.random();
  if (encounterRoll < ENCOUNTER_CHANCE) {
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

  return finishDraft(newState);
};

/** Synchronously drains the raid-tick generator and returns the next state. */
export const runRaidTick = (state: GameState): GameState => {
  const gen = runRaidTickGenerator(state);
  let result = gen.next();
  while (!result.done) result = gen.next();
  return result.value;
};

/**
 * AsyncGenerator variant of a single raid tick, delegating to the sync
 * generator. Future async consumers (UI tick loop, Phase 4 interceptors)
 * advance this generator to observe `InterruptHook`s without changing the
 * simulation outcome.
 */
export const runRaidTickAsync = async function* (state: GameState): AsyncGenerator<InterruptHook, GameState, unknown> {
  return yield* runRaidTickGenerator(state);
};
