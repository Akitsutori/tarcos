import { PMCCharacter, RaidState, Weapon } from "../types";
import { INITIAL_WEAPONS } from "../data/content/weapons";
import { createLog } from "./utils";
import { HEAL_PART_ORDER, SURGICAL_TARGET_ORDER } from "./bodyParts";
import { findBackupMedical, consumeFoundEntry, BLEED_STOP_COST, DEFAULT_HEAL_RESTORE, MAINTENANCE_HEAL_ATTEMPTS } from "../data/tuning/medicalConfig";
import { MAINTENANCE_HYDRATION_DRAIN_MIN, MAINTENANCE_HYDRATION_DRAIN_MAX, PROVISION_DRINK_THRESHOLD } from "../data/tuning/raidConfig";

/**
 * Performs post-combat medical and resource maintenance.
 * Executes in strict order: Surgery -> Bleed Stop -> Heal -> Ammo Resupply -> Hydration Drain.
 * 
 * @param pmc Player character state (mutated)
 * @param raid Active raid state (mutated)
 * @param equippedWeapon The currently equipped weapon for ammo resupply
 */
export const executeMaintenancePhase = (pmc: PMCCharacter, raid: RaidState, equippedWeapon?: Weapon) => {
  // Step 1: Surgical Kit Repair
  const surgicalTargetOrder = SURGICAL_TARGET_ORDER;
  
  for (const partId of surgicalTargetOrder) {
    const part = pmc.bodyParts[partId];
    if (part.current <= 0) {
      if (pmc.equippedSurgicalKit && pmc.equippedSurgicalKit.resourceCurrent && pmc.equippedSurgicalKit.resourceCurrent > 0) {
        part.current = 1;
        pmc.equippedSurgicalKit.resourceCurrent--;
        raid.logs.push(createLog(`Surgical repair completed: restored [${part.name}] blacked out limb to 1 HP using ${pmc.equippedSurgicalKit.name}. Uses remaining: ${pmc.equippedSurgicalKit.resourceCurrent}.`, "heal", raid.elapsedSeconds));
      } else {
        const backupEntryIdx = findBackupMedical(raid.lootFound, "surgical");
        if (backupEntryIdx !== -1) {
          const backup = raid.lootFound[backupEntryIdx].item;
          part.current = 1;
          backup.resourceCurrent!--;
          pmc.equippedSurgicalKit = backup;
          raid.logs.push(createLog(`Equipped backup surgical kit ${backup.name} and repaired [${part.name}] blacked out limb. Uses: ${backup.resourceCurrent}.`, "heal", raid.elapsedSeconds));

          consumeFoundEntry(raid.lootFound, backupEntryIdx);
        } else {
          raid.logs.push(createLog(`Limb [${part.name}] remains blacked out — No active surgical kit available!`, "warning", raid.elapsedSeconds));
        }
      }
    }
  }

  // Step 2: Bleed Stop
  if (pmc.isBleeding) {
    if (pmc.equippedMedkit && pmc.equippedMedkit.resourceCurrent && pmc.equippedMedkit.resourceCurrent >= BLEED_STOP_COST) {
      pmc.equippedMedkit.resourceCurrent -= BLEED_STOP_COST;
      pmc.isBleeding = false;
      raid.logs.push(createLog(`Stopped active arterial bleeding. Consumed ${BLEED_STOP_COST} resource points of ${pmc.equippedMedkit.name}. Capacity: ${pmc.equippedMedkit.resourceCurrent}/${pmc.equippedMedkit.resourceMax}.`, "heal", raid.elapsedSeconds));
    } else {
      const backupIdx = findBackupMedical(raid.lootFound, "medkit", BLEED_STOP_COST);
      if (backupIdx !== -1) {
        const backup = raid.lootFound[backupIdx].item;
        backup.resourceCurrent! -= BLEED_STOP_COST;
        pmc.equippedMedkit = backup;
        pmc.isBleeding = false;
        raid.logs.push(createLog(`Equipped backup medkit ${backup.name} and stopped arterial bleeding. Capacity: ${backup.resourceCurrent}/${backup.resourceMax}.`, "heal", raid.elapsedSeconds));

        consumeFoundEntry(raid.lootFound, backupIdx);
      } else {
        raid.logs.push(createLog("Warning: Arterial bleeding continues — No medical resource pool available to stop clot!", "warning", raid.elapsedSeconds));
      }
    }
  }

  // Step 3: Medkit Healing
  const healOrder = HEAL_PART_ORDER;
  const healHPRestore = pmc.equippedMedkit?.hpHeal ?? DEFAULT_HEAL_RESTORE;

  let healAttemptsCount = MAINTENANCE_HEAL_ATTEMPTS;
  while (healAttemptsCount > 0) {
    let healedThisPass = false;

    for (const partId of healOrder) {
      const part = pmc.bodyParts[partId];
      if (part.current > 0 && part.current < part.max) {
        const missing = part.max - part.current;
        const healAmt = Math.min(healHPRestore, missing);

        if (pmc.equippedMedkit && pmc.equippedMedkit.resourceCurrent && pmc.equippedMedkit.resourceCurrent > 0) {
          const actualUse = Math.min(healAmt, pmc.equippedMedkit.resourceCurrent);
          part.current += actualUse;
          pmc.equippedMedkit.resourceCurrent -= actualUse;
          healedThisPass = true;
          raid.usedMedkitDuringRaid = true;

          raid.logs.push(createLog(`Applied ${pmc.equippedMedkit.name} and healed [${part.name}] for +${actualUse} HP. Durability: ${pmc.equippedMedkit.resourceCurrent}/${pmc.equippedMedkit.resourceMax}.`, "heal", raid.elapsedSeconds));

          if (pmc.equippedMedkit.resourceCurrent <= 0) pmc.equippedMedkit = null;
        } else {
          const backupIdx = findBackupMedical(raid.lootFound, "medkit");
          if (backupIdx !== -1) {
            const backup = raid.lootFound[backupIdx].item;
            const actualUse = Math.min(healAmt, backup.resourceCurrent!);
            part.current += actualUse;
            backup.resourceCurrent! -= actualUse;
            pmc.equippedMedkit = backup;
            healedThisPass = true;
            raid.usedMedkitDuringRaid = true;

            raid.logs.push(createLog(`Equipped backup medkit ${backup.name} and healed [${part.name}] for +${actualUse} HP. Capacity: ${backup.resourceCurrent}/${backup.resourceMax}.`, "heal", raid.elapsedSeconds));

            consumeFoundEntry(raid.lootFound, backupIdx);

            if (backup.resourceCurrent! <= 0) pmc.equippedMedkit = null;
          }
        }
      }
    }
    if (!healedThisPass) break;
    healAttemptsCount--;
  }

  // Step 4: Ammo Resupply
  const actualWeapon = equippedWeapon || INITIAL_WEAPONS[pmc.classType];
  const currentMagMissing = actualWeapon.maxMagSize - actualWeapon.currentMagRounds;
  const reservesMissing = actualWeapon.maxReserveMags - actualWeapon.reserveMags;

  if (currentMagMissing > 0 || reservesMissing > 0) {
    const ammoBoxIdx = raid.lootFound.findIndex(e => e.item.type === "ammo" && e.item.caliber === actualWeapon.caliber);
    if (ammoBoxIdx !== -1) {
      actualWeapon.currentMagRounds = actualWeapon.maxMagSize;
      actualWeapon.reserveMags = actualWeapon.maxReserveMags;
      raid.logs.push(createLog(`Unpacked matching ammunition box ${raid.lootFound[ammoBoxIdx].item.name} from backpack. Magazines and reserve munitions fully replenished.`, "info", raid.elapsedSeconds));

      if (raid.lootFound[ammoBoxIdx].quantity > 1) raid.lootFound[ammoBoxIdx].quantity--;
      else raid.lootFound.splice(ammoBoxIdx, 1);
    }
  }

  // Step 5: Hydration Drain and Provision Consumption
  const hydrationDrain = MAINTENANCE_HYDRATION_DRAIN_MIN + Math.floor(Math.random() * MAINTENANCE_HYDRATION_DRAIN_MAX);
  pmc.hydration = Math.max(0, pmc.hydration - hydrationDrain);

  if (pmc.hydration < PROVISION_DRINK_THRESHOLD) {
    if (pmc.equippedProvision && pmc.equippedProvision.resourceCurrent && pmc.equippedProvision.resourceCurrent > 0) {
      const missing = pmc.maxHydration - pmc.hydration;
      const healAmt = Math.min(missing, pmc.equippedProvision.resourceCurrent);
      pmc.hydration += healAmt;
      pmc.equippedProvision.resourceCurrent -= healAmt;
      raid.logs.push(createLog(`PMC is thirsty. Consumed equipped provision. Restored +${healAmt} Hydration.`, "heal", raid.elapsedSeconds));
      if (pmc.equippedProvision.resourceCurrent <= 0) pmc.equippedProvision = null;
    } else {
      const backupIdx = findBackupMedical(raid.lootFound, "provision");
      if (backupIdx !== -1) {
        const backup = raid.lootFound[backupIdx].item;
        const missing = pmc.maxHydration - pmc.hydration;
        const healAmt = Math.min(missing, backup.resourceCurrent!);
        pmc.hydration += healAmt;
        backup.resourceCurrent! -= healAmt;
        raid.logs.push(createLog(`PMC discovered ${backup.name} in backpack and drank it. Restored +${healAmt} Hydration.`, "heal", raid.elapsedSeconds));

        if (backup.resourceCurrent! <= 0) {
          consumeFoundEntry(raid.lootFound, backupIdx);
        }
      }
    }
  }

  const hpStr = `Vital Monitor: Head ${pmc.bodyParts.head.current}/${pmc.bodyParts.head.max} | Thorax ${pmc.bodyParts.thorax.current}/${pmc.bodyParts.thorax.max} | Stomach ${pmc.bodyParts.stomach.current}/${pmc.bodyParts.stomach.max} | L.Arm ${pmc.bodyParts.leftArm.current}/${pmc.bodyParts.leftArm.max} | R.Arm ${pmc.bodyParts.rightArm.current}/${pmc.bodyParts.rightArm.max} | L.Leg ${pmc.bodyParts.leftLeg.current}/${pmc.bodyParts.leftLeg.max} | R.Leg ${pmc.bodyParts.rightLeg.current}/${pmc.bodyParts.rightLeg.max}`;
  raid.logs.push(createLog(hpStr, "info", raid.elapsedSeconds));
};
