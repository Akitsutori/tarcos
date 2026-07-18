import React, { useEffect, useCallback } from "react";
import { GameState, PMCBodyParts } from "../types";
import { runRaidTick } from "../gameEngine";
import { STORAGE_KEY } from "./useGameSave";

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

        const newState = JSON.parse(JSON.stringify(prev)) as GameState;
        const pmc = newState.pmc;
        const medstationLvl = newState.hideout.medstation.level;
        const nutritionLvl = newState.hideout.nutritionUnit.level;

        let hasUpdates = false;

        let healAmount = 1;
        if (medstationLvl === 1) healAmount = 2;
        else if (medstationLvl === 2) healAmount = 5;
        else if (medstationLvl === 3) healAmount = 12;

        let neededHeal = healAmount;
        const partIds: (keyof PMCBodyParts)[] = ["head", "thorax", "stomach", "leftLeg", "rightLeg", "leftArm", "rightArm"];
        
        for (const partId of partIds) {
          if (neededHeal <= 0) break;
          const part = pmc.bodyParts[partId];
          if (part.current < part.max) {
            const healable = Math.min(neededHeal, part.max - part.current);
            part.current += healable;
            neededHeal -= healable;
            hasUpdates = true;
          }
        }

        if (nutritionLvl >= 1) {
          if (pmc.energy < pmc.maxEnergy) {
            pmc.energy = Math.min(pmc.maxEnergy, pmc.energy + 2);
            hasUpdates = true;
          }
          if (pmc.hydration < pmc.maxHydration) {
            pmc.hydration = Math.min(pmc.maxHydration, pmc.hydration + 2);
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          return newState;
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

      const nextState = runRaidTick(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    });
  }, [setGameState]);

  return { handleTick };
};
