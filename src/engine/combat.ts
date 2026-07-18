import { PMCCharacter, EnemyState, Weapon, RaidState, RaidLog, BodyPart, PMCBodyParts, ClassType, GameItem, CombatantView } from "../types";
import { getWeaponStats } from "../data";
import { createLog } from "./utils";

const createDefaultWeapon = (): Weapon => ({
  id: "assault_rifle",
  name: "Assault Rifle (7.62x39mm)",
  baseErgo: 50,
  baseRecoil: 85,
  baseDmg: 50,
  baseAccuracy: 50,
  mods: {},
  signatureClass: ClassType.SOLDIER,
  caliber: "7.62x39mm",
  currentMagRounds: 30,
  maxMagSize: 30,
  reserveMags: 3,
  maxReserveMags: 3
});

const calculateAccuracy = (attacker: CombatantView, defender: CombatantView, burstDecay: number): number => {
  const baseAcc = attacker.baseAccuracy;
  const skillWeap = attacker.skills.weaponSkill.level;
  const coverPenalty = defender.isCovered ? 20 : 0;
  
  let hydrationPenalty = 0;
  if (attacker.hydration < 25) hydrationPenalty = 10;
  else if (attacker.hydration < 50) hydrationPenalty = 5;

  const weaponStats = getWeaponStats(attacker.equippedWeapon, 0); // basic stats for enemy, pmc passes active

  return Math.min(95, Math.max(5, 
    baseAcc + (weaponStats.accuracy * 0.5) + skillWeap * 1.0 - burstDecay - coverPenalty - hydrationPenalty
  ));
};

const resolveBleeding = (actor: CombatantView, logs: RaidLog[], elapsedSeconds: number) => {
  if (!actor.isBleeding) return;

  const bleedPartId = actor.bleedingPartId as keyof PMCBodyParts | undefined;
  const bleedPart = bleedPartId ? actor.bodyParts[bleedPartId] : null;
  const highestPart = bleedPart && bleedPart.current > 0
    ? bleedPart
    : (Object.values(actor.bodyParts) as BodyPart[]).filter(p => p.current > 0).sort((a, b) => b.current - a.current)[0];

  if (highestPart && highestPart.current > 0) {
    const bleedDmg = Math.max(1, 5 - Math.floor(actor.skills.constitution.level * 0.01));
    highestPart.current = Math.max(0, highestPart.current - bleedDmg);
    logs.push(createLog(`${actor.name} bled on [${highestPart.name}] for ${bleedDmg} damage.`, "combat_hit", elapsedSeconds));

    if (actor.bodyParts.head.current <= 0 || actor.bodyParts.thorax.current <= 0) {
      logs.push(createLog(`${actor.name} succumbed to fatal arterial bleeding!`, "death", elapsedSeconds));
      actor.isDead = true;
    }
  }
};

/**
 * Simulates a single round of combat using functional structural typing (CombatantView).
 */
export const simulateCombatRound = (pmc: PMCCharacter, enemy: EnemyState, weapon: Weapon, weaponStats: any, elapsedSeconds: number, raid: RaidState): RaidLog[] => {
  const roundLogs: RaidLog[] = [];

  // 1. Compose Views (Lenses)
  const pmcView: CombatantView = {
    ...pmc,
    name: "PMC",
    type: "pmc",
    baseAccuracy: 30,
    hydration: pmc.hydration,
    equippedWeapon: weapon,
    equippedArmor: pmc.equippedArmor,
    equippedHelmet: pmc.equippedHelmet,
    isBleeding: pmc.isBleeding,
    bleedingPartId: pmc.bleedingPartId,
    isCovered: pmc.isCovered,
    isDead: pmc.isDead
  };

  const enemyWeapon = enemy.equippedWeapon || createDefaultWeapon();
  if (!enemy.equippedWeapon) enemy.equippedWeapon = enemyWeapon; // persist default

  const enemyView: CombatantView = {
    ...enemy,
    type: "enemy",
    hydration: 100,
    equippedWeapon: enemyWeapon,
    equippedArmor: enemy.equippedArmor,
    equippedHelmet: enemy.equippedHelmet,
    isBleeding: enemy.isBleeding,
    bleedingPartId: enemy.bleedingPartId,
    isCovered: enemy.isCovered,
    isDead: enemy.isDead
  };

  // 2. Initiative
  const pmcInitRoll = Math.floor(Math.random() * 20) + pmcView.skills.initiative.level;
  const enemyInitRoll = Math.floor(Math.random() * 20) + enemyView.skills.initiative.level;
  const pmcFirst = pmcInitRoll >= enemyInitRoll;

  const enemyHpTotal = Object.values(enemyView.bodyParts).reduce((s, p) => s + p.current, 0);
  const enemyHpMax = Object.values(enemyView.bodyParts).reduce((s, p) => s + p.max, 0);
  const enemyArmorStr = enemyView.equippedArmor ? `${enemyView.equippedArmor.name} (Class ${enemyView.equippedArmor.armorClass})` : "None";
  roundLogs.push(createLog(`[COMBAT] ${enemyView.name} Lv.${enemyView.level} | HP: ${enemyHpTotal}/${enemyHpMax} | Armor: ${enemyArmorStr} | Weapon: ${enemyView.equippedWeapon.name}`, "combat_profile", elapsedSeconds));
  
  const pmcInitStr = `PMC rolled ${pmcInitRoll}`;
  const enemyInitStr = `${enemyView.name} rolled ${enemyInitRoll}`;
  roundLogs.push(createLog(`[INIT] ${pmcInitStr} vs ${enemyInitStr} → ${pmcFirst ? "PMC acts first" : "Enemy acts first"}`, "info", elapsedSeconds));

  const actors = pmcFirst ? [pmcView, enemyView] : [enemyView, pmcView];

  // 3. Combat Loop
  for (const attacker of actors) {
    const defender = attacker.type === "pmc" ? enemyView : pmcView;

    if (attacker.bodyParts.head.current <= 0 || attacker.bodyParts.thorax.current <= 0) attacker.isDead = true;
    else if (attacker.isDead) attacker.isDead = false;
    if (defender.bodyParts.head.current <= 0 || defender.bodyParts.thorax.current <= 0) defender.isDead = true;
    else if (defender.isDead) defender.isDead = false;
    if (attacker.isDead || defender.isDead) break;

    resolveBleeding(attacker, roundLogs, elapsedSeconds);
    if (attacker.isDead) break;

    // Action Priority
    let actionChosen: "reload" | "cover" | "flee" | "fire" | "wait" = "fire";
    const curWep = attacker.equippedWeapon;

    if (curWep.currentMagRounds <= 0 && curWep.reserveMags > 0) {
      actionChosen = "reload";
    } else if (curWep.currentMagRounds <= 0 && curWep.reserveMags <= 0) {
      const fleeChance = 0.30 + attacker.skills.agility.level * 0.02;
      actionChosen = Math.random() < fleeChance ? "flee" : "wait";
    } else if (!attacker.isCovered && Math.random() < 0.40) {
      actionChosen = "cover";
    }

    // Execute Actions
    if (actionChosen === "reload") {
      curWep.currentMagRounds = curWep.maxMagSize;
      curWep.reserveMags--;
      roundLogs.push(createLog(`${attacker.name} reloaded. Mag: ${curWep.currentMagRounds}, Reserves: ${curWep.reserveMags}.`, "info", elapsedSeconds));
      if (attacker.type === "pmc" && pmc.classType === ClassType.SURVIVOR) {
        actionChosen = "fire";
        roundLogs.push(createLog("SURVIVOR PASSIVE: Free Reload triggered!", "info", elapsedSeconds));
      } else {
        continue;
      }
    }

    if (actionChosen === "cover") {
      attacker.isCovered = true;
      roundLogs.push(createLog(`${attacker.name} ducked into COVER. Attacker accuracy reduced by 20.`, "info", elapsedSeconds));
      continue;
    }

    if (actionChosen === "flee") {
      roundLogs.push(createLog(`${attacker.name} aborted combat and fled!`, "warning", elapsedSeconds));
      raid.status = "scavenging";
      raid.currentStage++;
      raid.combatTarget = null;
      attacker.isCovered = false;
      break;
    }

    if (actionChosen === "wait") {
      roundLogs.push(createLog(`${attacker.name} is out of ammo and exposed!`, "warning", elapsedSeconds));
      continue;
    }

    if (actionChosen === "fire") {
      // Cover expires when the actor commits to firing — it was a 1-tick bonus.
      // The defender still had the cover accuracy penalty for THIS round's incoming shots.
      if (attacker.isCovered) {
        attacker.isCovered = false;
        roundLogs.push(createLog(`${attacker.name} broke cover to engage.`, "info", elapsedSeconds));
      }

      const isScoutSMG = attacker.type === "pmc" && pmc.classType === ClassType.SCOUT;
      const minBurst = isScoutSMG ? 3 : 1;
      const maxBurst = isScoutSMG ? 7 : 5;
      const maxPossible = Math.min(curWep.currentMagRounds, maxBurst);
      const burstCount = Math.floor(Math.random() * (maxPossible - minBurst + 1)) + minBurst;

      if (burstCount <= 0) continue;
      roundLogs.push(createLog(`${attacker.name} initiated burst spray of ${burstCount} rounds.`, "info", elapsedSeconds));

      const activeWeaponStats = attacker.type === "pmc" ? weaponStats : getWeaponStats(curWep, 0);

      for (let b = 0; b < burstCount; b++) {
        curWep.currentMagRounds--;
        
        const decayRate = attacker.type === "pmc" ? 2.5 : 3.0;
        const burstDecay = b * decayRate;
        const finalAccuracy = calculateAccuracy(attacker, defender, burstDecay);

        roundLogs.push(createLog(`[ACC] ${attacker.name} Accuracy: ${finalAccuracy.toFixed(1)}%`, "info", elapsedSeconds));

        if (Math.random() * 100 >= finalAccuracy) continue;

        const dodgeFactor = 0.0025;
        const dodgeMult = (attacker.type === "enemy" && pmc.classType === ClassType.SCOUT) ? 2.0 : 1.0;
        if (Math.random() < defender.skills.agility.level * dodgeFactor * dodgeMult) {
          roundLogs.push(createLog(`${defender.name} dynamically dodged the incoming bullet!`, "info", elapsedSeconds));
          continue;
        }

        const bodyPartsList: (keyof PMCBodyParts)[] = ["head", "thorax", "stomach", "leftArm", "rightArm", "leftLeg", "rightLeg"];
        const targetedPartId = bodyPartsList[Math.floor(Math.random() * bodyPartsList.length)];
        const targetedPart = defender.bodyParts[targetedPartId];

        let activeArmor: GameItem | null = null;
        if (targetedPartId === "head" && defender.equippedHelmet) activeArmor = defender.equippedHelmet;
        else if (defender.equippedArmor && defender.equippedArmor.protectedZones?.map(z => z.toLowerCase()).includes(targetedPart.name.toLowerCase())) {
          activeArmor = defender.equippedArmor;
        }

        let bulletPen = 20;
        if (curWep.caliber === "7.62x39mm") bulletPen = 34;
        else if (curWep.caliber === "9x19mm") bulletPen = isScoutSMG ? 32 : 20;
        else if (curWep.caliber === "12x70mm") bulletPen = 18;
        else if (curWep.caliber === "7.62x54mm") bulletPen = 45;
        else if (curWep.caliber === "9x18mm") bulletPen = 15;

        let dmgMultiplier = 1.0;

        if (activeArmor && activeArmor.armorClass && activeArmor.durability && activeArmor.maxDurability) {
          const effectiveArmor = activeArmor.armorClass * (activeArmor.durability / activeArmor.maxDurability);
          const armorThreshold = effectiveArmor * 10;
          if (bulletPen < armorThreshold) {
            dmgMultiplier = 0.20;
            activeArmor.durability = Math.max(0, activeArmor.durability - 5);
            roundLogs.push(createLog(`[PEN] BLOCKED by ${activeArmor.name} (20% dmg) | Armor Dur: ${activeArmor.durability}/${activeArmor.maxDurability}`, "combat_damage", elapsedSeconds));
          } else {
            dmgMultiplier = 0.60;
            activeArmor.durability = Math.max(0, activeArmor.durability - 10);
            roundLogs.push(createLog(`[PEN] PENETRATED ${activeArmor.name} (60% dmg) | Armor Dur: ${activeArmor.durability}/${activeArmor.maxDurability}`, "combat_damage", elapsedSeconds));
          }
        }

        let bulletDmg = Math.floor(activeWeaponStats.dmg * dmgMultiplier);
        if (attacker.type === "pmc" && pmc.classType === ClassType.SOLDIER) bulletDmg = Math.floor(bulletDmg * 1.20);
        else if (attacker.type === "enemy" && pmc.classType === ClassType.SOLDIER) bulletDmg = Math.floor(bulletDmg * 0.85);

        targetedPart.current = Math.max(0, targetedPart.current - bulletDmg);
        roundLogs.push(createLog(`[DMG] ${attacker.name} → ${defender.name} [${targetedPart.name.toUpperCase()}]: ${bulletDmg} dmg | Part HP: ${targetedPart.current}/${targetedPart.max}`, "combat_damage", elapsedSeconds));

        if (targetedPartId === "thorax" && targetedPart.current <= 0 && bulletDmg > targetedPart.current) {
          let overflow = bulletDmg;
          const spilloverOrder: (keyof PMCBodyParts)[] = ["stomach", "leftArm", "rightArm", "leftLeg", "rightLeg"];
          for (const spillId of spilloverOrder) {
            const spillPart = defender.bodyParts[spillId];
            if (spillPart.current > 0) {
              const absorb = Math.min(spillPart.current, overflow);
              spillPart.current = Math.max(0, spillPart.current - absorb);
              overflow -= absorb;
              if (overflow <= 0) break;
            }
          }
        }

        const armorDeflectedFully = activeArmor && bulletPen < (activeArmor.armorClass! * (activeArmor.durability! / activeArmor.maxDurability!)) * 10;
        if (!armorDeflectedFully && targetedPart.current > 0) {
          let bleedChance = Math.max(5, 35 - defender.skills.constitution.level * 1.0);
          if (defender.hydration < 25) bleedChance += 10;
          else if (defender.hydration < 50) bleedChance += 5;

          if (Math.random() * 100 < bleedChance) {
            defender.isBleeding = true;
            defender.bleedingPartId = targetedPartId;
            roundLogs.push(createLog(`[BLEED] ${attacker.name} → ${defender.name}: HIT | Target BLEEDING from [${targetedPart.name}]!`, "warning", elapsedSeconds));
          }
        }

        if (defender.bodyParts.head.current <= 0 || defender.bodyParts.thorax.current <= 0) {
          if (attacker.type === "pmc") {
            roundLogs.push(createLog(`PMC neutralized ${defender.name} with a fatal shot!`, "combat_kill", elapsedSeconds));
            defender.isDead = true;
          } else {
            if (pmc.classType === ClassType.LUCKY && Math.random() < 0.15) {
              defender.bodyParts.head.current = 1;
              defender.bodyParts.thorax.current = 1;
              roundLogs.push(createLog("LUCKY PASSIVE TRIGGERED! PMC bypassed a fatal hit and survived at 1 HP!", "warning", elapsedSeconds));
            } else {
              roundLogs.push(createLog("PMC was KILLED IN ACTION (KIA) due to trauma in critical zones!", "death", elapsedSeconds));
              defender.isDead = true;
            }
          }
          break;
        }
      }
      
      const pmcHp = Object.values(pmcView.bodyParts).reduce((s, p) => s + p.current, 0);
      const enemyHp = Object.values(enemyView.bodyParts).reduce((s, p) => s + p.current, 0);
      roundLogs.push(createLog(`[ROUND] ${attacker.name} fired ${burstCount} rounds | PMC: ${pmcHp} HP | ${enemyView.name}: ${enemyHp} HP`, "combat_round", elapsedSeconds));

      if (attacker.isDead || defender.isDead) break;
    }
  }

  // 4. Copy primitives back to source objects
  pmc.isBleeding = pmcView.isBleeding;
  pmc.bleedingPartId = pmcView.bleedingPartId;
  pmc.isCovered = pmcView.isCovered;
  pmc.isDead = pmcView.isDead;

  enemy.isBleeding = enemyView.isBleeding;
  enemy.bleedingPartId = enemyView.bleedingPartId;
  enemy.isCovered = enemyView.isCovered;
  enemy.isDead = enemyView.isDead;

  return roundLogs;
};
