import { GameState, GameItem } from "../types";
import { ARCHETYPE_WEIGHTS } from "../data";
import { createLog } from "./utils";
import { KIAReason } from "./types";
import { finalizeQuestsAndXP, refillQuests } from "./progression";
import { XP_PER_LEVEL, PERCEPTION_XP_GAIN } from "../data/tuning/progressionConfig";

/**
 * Moves a single loot entry into the stash, merging with any existing stack.
 */
const moveIntoStash = (state: GameState, entry: { item: GameItem; quantity: number }) => {
  const stashEntry = state.stash.items.find(st => st.item.id === entry.item.id);
  if (stashEntry) stashEntry.quantity += entry.quantity;
  else state.stash.items.push({ item: entry.item, quantity: entry.quantity });
};

/**
 * Awards +25 Perception XP and levels the skill up if the threshold is crossed.
 */
const gainPerceptionXp = (state: GameState) => {
  const pmc = state.pmc;
  const raid = state.activeRaid;
  const perception = pmc.skills.perception;
  perception.xp += PERCEPTION_XP_GAIN;
  if (perception.xp >= perception.maxXp) {
    perception.level++;
    perception.xp -= perception.maxXp;
    raid.logs.push(createLog(`SKILL INCREASE: Perception reached Level ${perception.level}!`, "info", raid.elapsedSeconds));
  }
};

/**
 * Rolls the PMC level-up loop until XP no longer meets the threshold,
 * awarding a weighted skill point per level via ARCHETYPE_WEIGHTS.
 */
const levelUpLoop = (state: GameState) => {
  const pmc = state.pmc;
  const raid = state.activeRaid;
  while (pmc.xp >= pmc.maxXp) {
    pmc.level++;
    pmc.xp -= pmc.maxXp;
    pmc.maxXp = pmc.level * XP_PER_LEVEL;
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
};

/**
 * Display messages per KIA cause. Reserved causes (not yet reachable by the
 * engine) fall through to their dedicated strings; if a future death path is
 * added without a message, the map is exhaustive so TypeScript flags it.
 */
const KIA_MESSAGES: Record<KIAReason, string> = {
  COMBAT_BALLISTICS: "PMC KIA in combat!",
  DEHYDRATION: "PMC KIA from dehydration/starvation!",
  STARVATION: "PMC KIA from starvation!",
  BLEED_OUT: "PMC KIA from bleeding out!",
  OVERDOSE_TOXICITY: "PMC KIA from overdose/toxicity!",
  ENVIRONMENTAL_HAZARD: "PMC KIA from environmental hazards!",
  MIA_TIMEOUT: "PMC KIA — missing in action!",
};

/**
 * Resolves a fatal raid outcome: flags the raid as KIA, transfers secure
 * container contents to the stash, and runs the shared death XP pipeline.
 *
 * @param state The global GameState (mutated)
 * @param reason Which fatality triggered the death pipeline
 */
export const handleKIA = (state: GameState, reason: KIAReason): void => {
  const raid = state.activeRaid;
  const pmc = state.pmc;

  raid.status = "kia";
  pmc.kiaCount++;
  pmc.raidsCount++;
  state.pastRaidOutcomes.push("kia");
  raid.isActive = false;

  raid.secureContainerSaved.forEach((containerEntry) => {
    const stashEntry = state.stash.items.find(i => i.item.id === containerEntry.item.id);
    if (stashEntry) stashEntry.quantity += containerEntry.quantity;
    else state.stash.items.push({ item: containerEntry.item, quantity: containerEntry.quantity });
  });

  const { logs: questLogs, earnedXp } = finalizeQuestsAndXP(state, false, state.hideout);
  pmc.xp += earnedXp;
  raid.logs.push(...questLogs);

  raid.logs.push(createLog(`${KIA_MESSAGES[reason]} Earned +${earnedXp} cumulative XP in raid.`, "death", raid.elapsedSeconds));

  gainPerceptionXp(state);
  levelUpLoop(state);

  pmc.survivalRate = Math.floor((pmc.survivedCount / pmc.raidsCount) * 100);
};

/**
 * Resolves a successful raid: flags the raid as extracted, banks all loot,
 * restores equipment durability, and runs the shared extraction XP pipeline.
 *
 * @param state The global GameState (mutated)
 */
export const handleExtraction = (state: GameState): void => {
  const raid = state.activeRaid;
  const pmc = state.pmc;

  raid.status = "extracted";
  pmc.survivedCount++;
  pmc.raidsCount++;
  state.pastRaidOutcomes.push("extracted");
  raid.isActive = false;

  const { logs: questLogs, earnedXp } = finalizeQuestsAndXP(state, true, state.hideout);
  pmc.xp += earnedXp;
  raid.logs.push(...questLogs);
  raid.logs.push(createLog(`PMC extracted successfully! Earned +${earnedXp} cumulative XP in raid.`, "extract", raid.elapsedSeconds));

  gainPerceptionXp(state);
  levelUpLoop(state);

  refillQuests(state);

  raid.lootFound.forEach((entry) => moveIntoStash(state, entry));
  raid.secureContainerSaved.forEach((entry) => moveIntoStash(state, entry));

  if (pmc.equippedArmor && pmc.equippedArmor.durability !== undefined && pmc.equippedArmor.maxDurability !== undefined) {
    pmc.equippedArmor.durability = pmc.equippedArmor.maxDurability;
  }
  if (pmc.equippedHelmet && pmc.equippedHelmet.durability !== undefined && pmc.equippedHelmet.maxDurability !== undefined) {
    pmc.equippedHelmet.durability = pmc.equippedHelmet.maxDurability;
  }

  pmc.survivalRate = Math.floor((pmc.survivedCount / pmc.raidsCount) * 100);
};
