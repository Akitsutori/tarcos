import { useState, useEffect, useCallback } from "react";
import { GameState, ClassType, GameItem, WeaponModCategory, PMCBodyParts } from "../types";
import { 
  createInitialPMC, 
  createInitialHideout, calculateBodyParts 
} from "../data/construction";
import { ALL_ITEMS } from "../data/content/items";
import { INITIAL_WEAPONS } from "../data/content/weapons";
import { ALL_QUESTS } from "../data/content/quests";

export const STORAGE_KEY = "tarkov_zero_player_state_v1";

export const createInitialState = (): GameState => {
  const initialClass = ClassType.SOLDIER;
  const initialPMC = createInitialPMC(initialClass);
  const sigWeapon = { ...INITIAL_WEAPONS[initialClass] };

  const starterItems = [
    { item: ALL_ITEMS.ai2, quantity: 4 },
    { item: ALL_ITEMS.ifak, quantity: 2 },
    { item: ALL_ITEMS.water_bottle, quantity: 3 },
    { item: ALL_ITEMS.bolts, quantity: 4 },
    { item: ALL_ITEMS.nuts, quantity: 4 },
    { item: ALL_ITEMS.cpu_fan, quantity: 2 },
    { item: ALL_ITEMS.spark_plug, quantity: 2 },
    { item: ALL_ITEMS.hose, quantity: 1 },
    { item: ALL_ITEMS.surgical_kit, quantity: 1 }
  ];

  const initialQuests = ALL_QUESTS.slice(0, 5).map(q => ({ ...q, progress: 0, completed: false }));

  return {
    pmc: initialPMC,
    stash: {
      items: starterItems,
      roubles: 120000,
      weapons: [sigWeapon],
      equippedWeaponId: sigWeapon.id
    },
    hideout: createInitialHideout(),
    activeRaid: {
      isActive: false,
      map: null,
      tiles: [],
      currentStage: 0,
      status: "deploying",
      combatTarget: null,
      logs: [],
      lootFound: [],
      secureContainerSaved: [],
      elapsedSeconds: 0,
      playSpeed: 1,
      usedMedkitDuringRaid: false,
      reinforcementsSpawnedThisTile: 0,
      killsByTier: { Scav: 0, PMC: 0, Boss: 0 }
    },
    selectedMapId: "factory",
    activeQuests: initialQuests,
    completedQuestIds: [],
    pastRaidOutcomes: []
  };
};

export const useGameSave = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        const defaultState = createInitialState();

        if (!parsed.pmc) parsed.pmc = defaultState.pmc;
        if (parsed.pmc.isBleeding === undefined) parsed.pmc.isBleeding = false;
        if (parsed.pmc.isCovered === undefined) parsed.pmc.isCovered = false;
        if (parsed.pmc.isDead === undefined) parsed.pmc.isDead = false;

        // Migrate old RaidState fields to PMCCharacter (legacy save-schema migration)
        const legacyRaid = parsed.activeRaid as unknown as { pmcIsBleeding?: boolean; pmcIsCovered?: boolean };
        if (legacyRaid.pmcIsBleeding !== undefined) {
          parsed.pmc.isBleeding = parsed.pmc.isBleeding || legacyRaid.pmcIsBleeding;
          delete legacyRaid.pmcIsBleeding;
        }
        if (legacyRaid.pmcIsCovered !== undefined) {
          parsed.pmc.isCovered = parsed.pmc.isCovered || legacyRaid.pmcIsCovered;
          delete legacyRaid.pmcIsCovered;
        }
        if (!parsed.stash) parsed.stash = defaultState.stash;
        if (!parsed.hideout) parsed.hideout = defaultState.hideout;
        if (!parsed.hideout.scavengerWorkstation) parsed.hideout.scavengerWorkstation = defaultState.hideout.scavengerWorkstation;
        if (!parsed.activeRaid) parsed.activeRaid = defaultState.activeRaid;

        if (!parsed.pmc.skills) {
          parsed.pmc.skills = defaultState.pmc.skills;
        } else {
          const defaultSkills = defaultState.pmc.skills;
          if (!parsed.pmc.skills.weaponSkill) parsed.pmc.skills.weaponSkill = defaultSkills.weaponSkill;
          if (!parsed.pmc.skills.constitution) parsed.pmc.skills.constitution = defaultSkills.constitution;
          if (!parsed.pmc.skills.perception) parsed.pmc.skills.perception = defaultSkills.perception;
          if (!parsed.pmc.skills.initiative) parsed.pmc.skills.initiative = defaultSkills.initiative;
          if (!parsed.pmc.skills.agility) parsed.pmc.skills.agility = defaultSkills.agility;
        }

        if (!parsed.pmc.bodyParts) {
          const conLevel = parsed.pmc.skills?.constitution?.level || 5;
          parsed.pmc.bodyParts = calculateBodyParts(conLevel);
        }

        if (!parsed.activeQuests) parsed.activeQuests = defaultState.activeQuests;
        if (!parsed.completedQuestIds) parsed.completedQuestIds = defaultState.completedQuestIds || [];
        if (!parsed.pastRaidOutcomes) parsed.pastRaidOutcomes = defaultState.pastRaidOutcomes || [];
        if (parsed.selectedMapId === undefined) parsed.selectedMapId = defaultState.selectedMapId || "factory";

        if (!parsed.activeRaid.tiles) parsed.activeRaid.tiles = [];
        if (parsed.activeRaid.usedMedkitDuringRaid === undefined) parsed.activeRaid.usedMedkitDuringRaid = false;
        if (parsed.activeRaid.reinforcementsSpawnedThisTile === undefined) parsed.activeRaid.reinforcementsSpawnedThisTile = 0;
        if (!parsed.activeRaid.killsByTier) parsed.activeRaid.killsByTier = { Scav: 0, PMC: 0, Boss: 0 };

        if (parsed.activeRaid.combatTarget) {
          const ct = parsed.activeRaid.combatTarget;
          if (!ct.bodyParts) {
            const conLevel = ct.skills?.constitution?.level || 5;
            ct.bodyParts = calculateBodyParts(conLevel);
          }
          if (!ct.skills) {
            ct.skills = {
              weaponSkill: { id: "weaponSkill", name: "Weapon Skill", description: "", level: 5, xp: 0, maxXp: 100, bonusPerLevel: "" },
              constitution: { id: "constitution", name: "Constitution", description: "", level: 5, xp: 0, maxXp: 100, bonusPerLevel: "" },
              perception: { id: "perception", name: "Perception", description: "", level: 5, xp: 0, maxXp: 100, bonusPerLevel: "" },
              initiative: { id: "initiative", name: "Initiative", description: "", level: 5, xp: 0, maxXp: 100, bonusPerLevel: "" },
              agility: { id: "agility", name: "Agility", description: "", level: 5, xp: 0, maxXp: 100, bonusPerLevel: "" }
            };
          }
        }
        
        if (parsed.stash.items) {
          parsed.stash.items = parsed.stash.items.map(entry => {
            const freshItem = ALL_ITEMS[entry.item?.id || ""];
            return freshItem ? { item: freshItem, quantity: entry.quantity } : entry;
          });
        } else {
          parsed.stash.items = defaultState.stash.items;
        }

        if (parsed.stash.weapons) {
          parsed.stash.weapons.forEach(weapon => {
            const template = Object.values(INITIAL_WEAPONS).find(w => w.id === weapon.id) || INITIAL_WEAPONS[ClassType.SOLDIER];
            if (weapon.currentMagRounds === undefined || isNaN(weapon.currentMagRounds)) weapon.currentMagRounds = template.currentMagRounds !== undefined ? template.currentMagRounds : 30;
            if (weapon.maxMagSize === undefined || isNaN(weapon.maxMagSize)) weapon.maxMagSize = template.maxMagSize !== undefined ? template.maxMagSize : 30;
            if (weapon.reserveMags === undefined || isNaN(weapon.reserveMags)) weapon.reserveMags = template.reserveMags !== undefined ? template.reserveMags : 3;
            if (weapon.maxReserveMags === undefined || isNaN(weapon.maxReserveMags)) weapon.maxReserveMags = template.maxReserveMags !== undefined ? template.maxReserveMags : 3;

            if (weapon.mods) {
              Object.keys(weapon.mods).forEach((cat) => {
                const mod = weapon.mods[cat as WeaponModCategory];
                if (mod) {
                  const freshMod = ALL_ITEMS[mod.id];
                  if (freshMod) weapon.mods[cat as WeaponModCategory] = freshMod;
                }
              });
            } else {
              weapon.mods = {};
            }
          });
        } else {
          parsed.stash.weapons = defaultState.stash.weapons;
          parsed.stash.equippedWeaponId = defaultState.stash.equippedWeaponId;
        }

        setGameState(parsed);
      } catch (e) {
        console.error("Error loading saved state, falling back to initial", e);
      }
    }
  }, []);

  const saveState = useCallback((state: GameState) => {
    setGameState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  const resetProgress = useCallback(() => {
    if (confirm("Are you sure you want to reset all game data, hideout shelters, and skills progress back to factory state?")) {
      const reset = createInitialState();
      setGameState(reset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
      return reset;
    }
    return null;
  }, []);

  return { gameState, setGameState, saveState, resetProgress };
};
