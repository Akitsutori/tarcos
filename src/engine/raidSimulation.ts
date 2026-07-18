import { GameState, ClassType, GameItem } from "../types";
import { getWeaponStats, ARCHETYPE_WEIGHTS, buildProceduralMap } from "../data";
import { createLog } from "./utils";
import { spawnEnemy } from "./spawning";
import { executeLootPhase, rollLootItem, getBackpackCapacity } from "./loot";
import { executeMaintenancePhase } from "./maintenance";
import { finalizeQuestsAndXP, refillQuests } from "./progression";
import { simulateCombatRound } from "./combat";

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
    raid.status = "kia";
    pmc.kiaCount++;
    pmc.raidsCount++;
    newState.pastRaidOutcomes.push("kia");
    raid.isActive = false;

    raid.secureContainerSaved.forEach((containerEntry) => {
      const stashEntry = newState.stash.items.find(i => i.item.id === containerEntry.item.id);
      if (stashEntry) stashEntry.quantity += containerEntry.quantity;
      else newState.stash.items.push({ item: containerEntry.item, quantity: containerEntry.quantity });
    });

    const { logs: questLogs, earnedXp } = finalizeQuestsAndXP(newState, false);
    pmc.xp += earnedXp;
    raid.logs.push(...questLogs);
    raid.logs.push(createLog(`PMC KIA from dehydration/starvation! Earned +${earnedXp} cumulative XP in raid.`, "death", raid.elapsedSeconds));

    const perception = pmc.skills.perception;
    perception.xp += 25;
    if (perception.xp >= perception.maxXp) {
      perception.level++;
      perception.xp -= perception.maxXp;
      raid.logs.push(createLog(`SKILL INCREASE: Perception reached Level ${perception.level}!`, "info", raid.elapsedSeconds));
    }

    while (pmc.xp >= pmc.maxXp) {
      pmc.level++;
      pmc.xp -= pmc.maxXp;
      pmc.maxXp = pmc.level * 200;
      raid.logs.push(createLog(`PMC LEVELED UP! Level reached: ${pmc.level}!`, "info", raid.elapsedSeconds));

      const weights = ARCHETYPE_WEIGHTS[pmc.classType];
      const keys = Object.keys(weights) as (keyof typeof weights)[];
      const sumWeights = keys.reduce((acc, k) => acc + (weights[k] as number), 0);
      let rand = Math.random() * sumWeights;
      for (const key of keys) {
        rand -= (weights[key] as number);
        if (rand <= 0) {
          pmc.skills[key].level++;
          raid.logs.push(createLog(`Skill Award: ${pmc.skills[key].name} upgraded to Level ${pmc.skills[key].level}!`, "info", raid.elapsedSeconds));
          break;
        }
      }
    }

    pmc.survivalRate = Math.floor((pmc.survivedCount / pmc.raidsCount) * 100);
    return newState;
  }

  // Combat State
  if (raid.status === "combat" && raid.combatTarget) {
    const enemy = raid.combatTarget;
    const combatLogs = simulateCombatRound(pmc, enemy, equippedWeapon, weaponStats, raid.elapsedSeconds, raid);
    raid.logs.push(...combatLogs);

    if (pmc.bodyParts.head.current <= 0 || pmc.bodyParts.thorax.current <= 0) {
      raid.status = "kia";
      pmc.kiaCount++;
      pmc.raidsCount++;
      newState.pastRaidOutcomes.push("kia");
      raid.isActive = false;

      raid.secureContainerSaved.forEach((containerEntry) => {
        const stashEntry = newState.stash.items.find(i => i.item.id === containerEntry.item.id);
        if (stashEntry) stashEntry.quantity += containerEntry.quantity;
        else newState.stash.items.push({ item: containerEntry.item, quantity: containerEntry.quantity });
      });

      const { logs: questLogs, earnedXp } = finalizeQuestsAndXP(newState, false);
      pmc.xp += earnedXp;
      raid.logs.push(...questLogs);
      raid.logs.push(createLog(`PMC KIA in combat! Earned +${earnedXp} cumulative XP in raid.`, "death", raid.elapsedSeconds));

      const perception = pmc.skills.perception;
      perception.xp += 25;
      if (perception.xp >= perception.maxXp) {
        perception.level++;
        perception.xp -= perception.maxXp;
        raid.logs.push(createLog(`SKILL INCREASE: Perception reached Level ${perception.level}!`, "info", raid.elapsedSeconds));
      }

      while (pmc.xp >= pmc.maxXp) {
        pmc.level++;
        pmc.xp -= pmc.maxXp;
        pmc.maxXp = pmc.level * 200;
        raid.logs.push(createLog(`PMC LEVELED UP! Level reached: ${pmc.level}!`, "info", raid.elapsedSeconds));

        const weights = ARCHETYPE_WEIGHTS[pmc.classType];
        const keys = Object.keys(weights) as (keyof typeof weights)[];
        const sumWeights = keys.reduce((acc, k) => acc + (weights[k] as number), 0);
        let rand = Math.random() * sumWeights;
        for (const key of keys) {
          rand -= (weights[key] as number);
          if (rand <= 0) {
            pmc.skills[key].level++;
            raid.logs.push(createLog(`Skill Award: ${pmc.skills[key].name} upgraded to Level ${pmc.skills[key].level}!`, "info", raid.elapsedSeconds));
            break;
          }
        }
      }

      pmc.survivalRate = Math.floor((pmc.survivedCount / pmc.raidsCount) * 100);
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
      pmc.xp += targetXP;
      raid.logs.push(createLog(`Neutralized target of tier ${enemy.tier}. Earned +${targetXP} XP.`, "info", raid.elapsedSeconds));

      const weaponSkill = pmc.skills.weaponSkill;
      weaponSkill.xp += 15;
      if (weaponSkill.xp >= weaponSkill.maxXp) {
        weaponSkill.level++;
        weaponSkill.xp -= weaponSkill.maxXp;
        raid.logs.push(createLog(`SKILL INCREASE: Weapon Skill reached Level ${weaponSkill.level}!`, "info", raid.elapsedSeconds));
      }

      const lootRollCount = enemy.tier === "Boss" ? 3 : enemy.tier === "PMC" ? 2 : 1;
      const luckBonus = pmc.classType === ClassType.LUCKY ? 25 : 0;
      const searchBonus = pmc.skills.perception.level * 1.0;

      for (let i = 0; i < lootRollCount; i++) {
        const item = rollLootItem(map, luckBonus + searchBonus);
        const capacity = getBackpackCapacity(pmc.skills.constitution.level);
        const uniqueBackpackCount = raid.lootFound.reduce((acc, e) => acc + e.quantity, 0);

        if (uniqueBackpackCount < capacity) {
          const secureCap = newState.hideout.intelligenceCenter.level >= 3 ? 9 : newState.hideout.intelligenceCenter.level >= 2 ? 6 : 4;
          raid.lootFound.push({ item, quantity: 1 });
          
          const allLoot = [...raid.lootFound, ...raid.secureContainerSaved];
          const singleItems: GameItem[] = [];
          allLoot.forEach(e => {
            for (let q = 0; q < e.quantity; q++) singleItems.push(e.item);
          });
          singleItems.sort((a, b) => b.value - a.value);

          const secureSorted: { [id: string]: { item: GameItem; quantity: number } } = {};
          const backpackSorted: { [id: string]: { item: GameItem; quantity: number } } = {};

          singleItems.forEach((single, idx) => {
            if (idx < secureCap) {
              if (!secureSorted[single.id]) secureSorted[single.id] = { item: single, quantity: 0 };
              secureSorted[single.id].quantity++;
            } else {
              if (!backpackSorted[single.id]) backpackSorted[single.id] = { item: single, quantity: 0 };
              backpackSorted[single.id].quantity++;
            }
          });

          raid.secureContainerSaved = Object.values(secureSorted);
          raid.lootFound = Object.values(backpackSorted);

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
        executeLootPhase(pmc, raid, map);

        raid.currentStage++;
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
    raid.status = "extracted";
    pmc.survivedCount++;
    pmc.raidsCount++;
    newState.pastRaidOutcomes.push("extracted");
    raid.isActive = false;

    const { logs: questLogs, earnedXp } = finalizeQuestsAndXP(newState, true);
    pmc.xp += earnedXp;
    raid.logs.push(...questLogs);
    raid.logs.push(createLog(`PMC extracted successfully! Earned +${earnedXp} cumulative XP in raid.`, "extract", raid.elapsedSeconds));

    const perception = pmc.skills.perception;
    perception.xp += 25;
    if (perception.xp >= perception.maxXp) {
      perception.level++;
      perception.xp -= perception.maxXp;
      raid.logs.push(createLog(`SKILL INCREASE: Perception reached Level ${perception.level}!`, "info", raid.elapsedSeconds));
    }

    while (pmc.xp >= pmc.maxXp) {
      pmc.level++;
      pmc.xp -= pmc.maxXp;
      pmc.maxXp = pmc.level * 200;
      raid.logs.push(createLog(`PMC LEVELED UP! Level reached: ${pmc.level}!`, "info", raid.elapsedSeconds));

      const weights = ARCHETYPE_WEIGHTS[pmc.classType];
      const keys = Object.keys(weights) as (keyof typeof weights)[];
      const sumWeights = keys.reduce((acc, k) => acc + (weights[k] as number), 0);
      let rand = Math.random() * sumWeights;
      for (const key of keys) {
        rand -= (weights[key] as number);
        if (rand <= 0) {
          pmc.skills[key].level++;
          raid.logs.push(createLog(`Skill Award: ${pmc.skills[key].name} upgraded to Level ${pmc.skills[key].level}!`, "info", raid.elapsedSeconds));
          break;
        }
      }
    }

    refillQuests(newState);

    const moveIntoStash = (entry: { item: GameItem; quantity: number }) => {
      const stashEntry = newState.stash.items.find(st => st.item.id === entry.item.id);
      if (stashEntry) stashEntry.quantity += entry.quantity;
      else newState.stash.items.push({ item: entry.item, quantity: entry.quantity });
    };

    raid.lootFound.forEach(moveIntoStash);
    raid.secureContainerSaved.forEach(moveIntoStash);

    if (pmc.equippedArmor && pmc.equippedArmor.durability !== undefined && pmc.equippedArmor.maxDurability !== undefined) {
      pmc.equippedArmor.durability = pmc.equippedArmor.maxDurability;
    }
    if (pmc.equippedHelmet && pmc.equippedHelmet.durability !== undefined && pmc.equippedHelmet.maxDurability !== undefined) {
      pmc.equippedHelmet.durability = pmc.equippedHelmet.maxDurability;
    }

    pmc.survivalRate = Math.floor((pmc.survivedCount / pmc.raidsCount) * 100);
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
    executeLootPhase(pmc, raid, map);
    executeMaintenancePhase(pmc, raid, equippedWeapon);
    raid.currentStage++;
  }

  return newState;
};
