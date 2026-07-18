import { GameState, RaidLog, Hideout } from "../types";
import { ALL_QUESTS } from "../data";
import { createLog } from "./utils";

/**
 * Calculates snapshot progress for all active quests and distributes base XP.
 * Applies extraction bonuses if applicable.
 *
 * @param state The global GameState
 * @param isExtraction True if the player successfully survived the raid
 * @param hideout Hideout state for XP multiplier bonuses
 * @returns Logs generated from quest progress and total XP earned
 */
export const finalizeQuestsAndXP = (state: GameState, isExtraction: boolean, hideout: Hideout): { logs: RaidLog[]; earnedXp: number } => {
  const raid = state.activeRaid;
  const logs: RaidLog[] = [];

  const totalKills = raid.killsByTier.Scav + raid.killsByTier.PMC + raid.killsByTier.Boss;
  const lootValue = raid.lootFound.reduce((acc, entry) => acc + (entry.item.value * entry.quantity), 0);
  const valCount = raid.lootFound.filter(e => e.item.type === "valuable").reduce((acc, e) => acc + e.quantity, 0);

  // Base XP formula: (Kills * 10) + (Loot Value / 10)
  let baseXP = (totalKills * 10) + Math.floor(lootValue / 10);
  if (isExtraction) {
    baseXP = Math.floor(baseXP * 1.25); // +25% Extraction bonus
  }

  // Intelligence Center XP multiplier
  const intelLevel = hideout.intelligenceCenter.level;
  if (intelLevel >= 1) {
    const xpMultiplier = intelLevel === 1 ? 1.05 : intelLevel === 2 ? 1.10 : 1.15;
    baseXP = Math.floor(baseXP * xpMultiplier);
  }

  let totalEarnedXp = baseXP;

  state.activeQuests = state.activeQuests.map((quest) => {
    if (quest.completed) return quest;

    let progressIncrement = 0;

    if (quest.type === "Kill") {
      if (quest.target === "Scav") progressIncrement = raid.killsByTier.Scav;
      else if (quest.target === "PMC") progressIncrement = raid.killsByTier.PMC;
      else if (quest.target === "Boss") progressIncrement = raid.killsByTier.Boss;
      else {
        progressIncrement = raid.killsByTier[quest.target] || 0;
      }
    } else if (quest.type === "Extract" && isExtraction) {
      if (quest.target === "no_medkit") {
        if (!raid.usedMedkitDuringRaid) progressIncrement = 1;
      } else {
        progressIncrement = 1;
      }
    } else if (quest.type === "Find" && isExtraction) {
      const hasItem = raid.lootFound.some(e => e.item.id === quest.target);
      if (hasItem) {
        progressIncrement = 1 - quest.progress;
      }
    } else if (quest.type === "Collect" && isExtraction) {
      progressIncrement = lootValue;
    } else if (quest.type === "Valuables" && isExtraction) {
      progressIncrement = valCount;
    }

    if (progressIncrement > 0) {
      quest.progress = Math.min(quest.count, quest.progress + progressIncrement);
      if (quest.progress >= quest.count) {
        quest.completed = true;
        totalEarnedXp += quest.rewardXp;
        logs.push(createLog(`QUEST COMPLETED: ${quest.name} (${quest.trader.toUpperCase()})! Awarded +${quest.rewardXp} XP.`, "extract", raid.elapsedSeconds));
      } else {
        logs.push(createLog(`Quest Progress Updated: ${quest.name} (${quest.progress}/${quest.count})`, "info", raid.elapsedSeconds));
      }
    }

    return quest;
  });

  return { logs, earnedXp: totalEarnedXp };
};

/**
 * Automatically replenishes active quests to maintain a pool of 5.
 * Excludes already completed quests.
 *
 * @param state The global GameState (mutated)
 */
export const refillQuests = (state: GameState) => {
  const activeIds = state.activeQuests.map(q => q.id);
  const completedIds = state.completedQuestIds;

  const availablePool = ALL_QUESTS.filter(q => !activeIds.includes(q.id) && !completedIds.includes(q.id));

  state.activeQuests.forEach(q => {
    if (q.completed && !completedIds.includes(q.id)) {
      completedIds.push(q.id);
    }
  });

  state.activeQuests = state.activeQuests.filter(q => !q.completed);

  while (state.activeQuests.length < 5 && availablePool.length > 0) {
    const randIdx = Math.floor(Math.random() * availablePool.length);
    const drawn = availablePool.splice(randIdx, 1)[0];
    state.activeQuests.push({ ...drawn, progress: 0, completed: false });
  }
};
