import React, { useEffect, useCallback } from "react";
import { GameState } from "../types";
import { runRaidTickGenerator } from "../engine/raidSimulation";
import { InterruptHook } from "../engine/contracts";
import { HEAL_PART_ORDER } from "../engine/bodyParts";
import { produce } from "immer";
import { STORAGE_KEY } from "./useGameSave";
import { MEDSTATION_HEAL_PER_5S_BY_LEVEL, nutritionRecoveryPer5s } from "../data/tuning/hideoutConfig";

/**
 * Hook to manage raid simulation ticks and passive out-of-raid recovery.
 */
export const useRaidTick = (
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {
  // Out of raid passive recovery loop (runs every 5 seconds if not active in a raid)
  useEffect(() => {
    const recoveryTimer = setInterval(() => {
      setGameState((prev) => {
        if (prev.activeRaid.isActive) return prev;

        const next = produce(prev, (draft) => {
          const pmc = draft.pmc;
          const medstationLvl = draft.hideout.medstation.level;
          const nutritionLvl = draft.hideout.nutritionUnit.level;

          let healAmount = MEDSTATION_HEAL_PER_5S_BY_LEVEL[medstationLvl] ?? 1;

          let neededHeal = healAmount;
          const partIds = HEAL_PART_ORDER;

          for (const partId of partIds) {
            if (neededHeal <= 0) break;
            const part = pmc.bodyParts[partId];
            if (part.current < part.max) {
              const healable = Math.min(neededHeal, part.max - part.current);
              part.current += healable;
              neededHeal -= healable;
            }
          }

          if (nutritionLvl >= 1) {
            const nutritionRecovery = nutritionRecoveryPer5s(nutritionLvl);
            if (pmc.energy < pmc.maxEnergy) {
              pmc.energy = Math.min(pmc.maxEnergy, pmc.energy + nutritionRecovery);
            }
            if (pmc.hydration < pmc.maxHydration) {
              pmc.hydration = Math.min(pmc.maxHydration, pmc.hydration + nutritionRecovery);
            }
          }
        });

        if (next !== prev) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        }

        return prev;
      });
    }, 5000);

    return () => clearInterval(recoveryTimer);
  }, [setGameState]);

  const handleTick = useCallback(() => {
    setGameState((prev) => {
      if (!prev.activeRaid.isActive) {
        return prev;
      }

      const gen = runRaidTickGenerator(prev);
      let result = gen.next();
      const hooks: InterruptHook[] = [];
      while (!result.done) {
        hooks.push(result.value as InterruptHook);
        result = gen.next();
      }
      const nextState = result.value;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    });
  }, [setGameState]);

  return { handleTick };
};
