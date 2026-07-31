import { PMCCharacter, EnemyState, Weapon, RaidState, RaidLog, BodyPart, PMCBodyParts, ClassType, GameItem, CombatantView } from "../types";
import { getWeaponStats } from "../data";
import { createLog } from "./utils";
import { EngineContext, InterruptHook } from "./types";
import { isFreeReloader, isSmgPassive, getBurstRange, getSmgPenetration, getDodgeMultiplier, getDamageMultipliers, getFatalSurviveChance } from "./behaviors/classPassives";

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

const calculateAccuracy = (attacker: CombatantView, defender: CombatantView, burstDecay: number, shootingRangeLevel: number): number => {
  const baseAcc = attacker.baseAccuracy;
  const skillWeap = attacker.skills.weaponSkill.level;
  const shootingRangeBonus = shootingRangeLevel >= 3 ? 6 : shootingRangeLevel === 2 ? 3 : shootingRangeLevel === 1 ? 1 : 0;
  const coverPenalty = defender.isCovered ? 20 : 0;
  
  let hydrationPenalty = 0;
  if (attacker.hydration < 25) hydrationPenalty = 10;
  else if (attacker.hydration < 50) hydrationPenalty = 5;

  const weaponStats = getWeaponStats(attacker.equippedWeapon, 0); // basic stats for enemy, pmc passes active

  return Math.min(95, Math.max(5, 
    baseAcc + (weaponStats.accuracy * 0.5) + (skillWeap + shootingRangeBonus) * 1.0 - burstDecay - coverPenalty - hydrationPenalty
  ));
};

const resolveBleeding = (actor: CombatantView, logs: RaidLog[], elapsedSeconds: number) => {
  if (!actor.isBleeding) return;

  const damagedParts = (Object.values(actor.bodyParts) as BodyPart[])
    .filter(p => p.current > 0 && p.current < p.max)
    .sort((a, b) => b.current - a.current);
  const target = damagedParts[0];

  if (target) {
    const bleedDmg = Math.max(1, 5 - Math.floor(actor.skills.constitution.level * 0.01));
    target.current = Math.max(0, target.current - bleedDmg);
    logs.push(createLog(`${actor.name} bled on [${target.name}] for ${bleedDmg} damage.`, "combat_hit", elapsedSeconds));

    if (actor.bodyParts.head.current <= 0 || actor.bodyParts.thorax.current <= 0) {
      logs.push(createLog(`${actor.name} succumbed to fatal arterial bleeding!`, "death", elapsedSeconds));
      actor.isDead = true;
    }
  }
};

/**
 * Core combat round as a synchronous generator. Yields an `InterruptHook` at
 * `BEFORE_ACTION` (action decided, before execution) and `AFTER_DAMAGE` (after
 * each landed bullet's damage intent). The yield points consume no RNG and
 * mutate no state, so draining the generator and taking its return value
 * reproduces the original synchronous combat round byte-for-byte.
 */
export const simulateCombatRoundGenerator = function* (
  pmc: PMCCharacter, enemy: EnemyState, weapon: Weapon, weaponStats: any, elapsedSeconds: number, raid: RaidState, shootingRangeLevel: number, context: EngineContext
): Generator<InterruptHook, RaidLog[], unknown> {
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

    yield {
      sourceEntityId: attacker.type === "pmc" ? "pmc" : "enemy",
      hookType: "BEFORE_ACTION",
      metadata: { attacker: attacker.name, defender: defender.name, action: actionChosen },
    };

    // Execute Actions
    if (actionChosen === "reload") {
      curWep.currentMagRounds = curWep.maxMagSize;
      curWep.reserveMags--;
      roundLogs.push(createLog(`${attacker.name} reloaded. Mag: ${curWep.currentMagRounds}, Reserves: ${curWep.reserveMags}.`, "info", elapsedSeconds));
      if (attacker.type === "pmc" && isFreeReloader(pmc.classType)) {
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

      const isScoutSMG = attacker.type === "pmc" && isSmgPassive(pmc.classType);
      const burstRange = isScoutSMG ? getBurstRange(pmc.classType) : { min: 1, max: 5 };
      const minBurst = burstRange.min;
      const maxBurst = burstRange.max;
      const maxPossible = Math.min(curWep.currentMagRounds, maxBurst);
      const burstCount = Math.floor(Math.random() * (maxPossible - minBurst + 1)) + minBurst;

      if (burstCount <= 0) continue;
      roundLogs.push(createLog(`${attacker.name} initiated burst spray of ${burstCount} rounds.`, "info", elapsedSeconds));

      const activeWeaponStats = attacker.type === "pmc" ? weaponStats : getWeaponStats(curWep, 0);

      for (let b = 0; b < burstCount; b++) {
        curWep.currentMagRounds--;
        
        const decayRate = attacker.type === "pmc" ? 2.5 : 3.0;
        const burstDecay = b * decayRate;
        const finalAccuracy = calculateAccuracy(attacker, defender, burstDecay, shootingRangeLevel);

        roundLogs.push(createLog(`[ACC] ${attacker.name} Accuracy: ${finalAccuracy.toFixed(1)}%`, "info", elapsedSeconds));

        if (Math.random() * 100 >= finalAccuracy) continue;

        const dodgeFactor = 0.0025;
        const dodgeMult = attacker.type === "enemy" ? getDodgeMultiplier(pmc.classType) : 1.0;
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
        else if (curWep.caliber === "9x19mm") bulletPen = getSmgPenetration(pmc.classType, 20);
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
        const dmgMultipliers = getDamageMultipliers(pmc.classType);
        if (attacker.type === "pmc") bulletDmg = Math.floor(bulletDmg * dmgMultipliers.outgoing);
        else if (attacker.type === "enemy") bulletDmg = Math.floor(bulletDmg * dmgMultipliers.incoming);

        context.emitIntent({
          targetEntityId: defender.type === "pmc" ? "pmc" : "enemy",
          type: "DAMAGE",
          value: { bodyPart: targetedPartId, amount: bulletDmg },
        });
        roundLogs.push(createLog(`[DMG] ${attacker.name} → ${defender.name} [${targetedPart.name.toUpperCase()}]: ${bulletDmg} dmg | Part HP: ${targetedPart.current}/${targetedPart.max}`, "combat_damage", elapsedSeconds));

        yield {
          sourceEntityId: attacker.type === "pmc" ? "pmc" : "enemy",
          hookType: "AFTER_DAMAGE",
          metadata: {
            attacker: attacker.name,
            defender: defender.name,
            bodyPart: targetedPartId,
            amount: bulletDmg,
            partHp: targetedPart.current,
          },
        };

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
            roundLogs.push(createLog(`[BLEED] ${attacker.name} → ${defender.name}: HIT! Target is now BLEEDING!`, "warning", elapsedSeconds));
          }
        }

        if (defender.bodyParts.head.current <= 0 || defender.bodyParts.thorax.current <= 0) {
          if (attacker.type === "pmc") {
            roundLogs.push(createLog(`PMC neutralized ${defender.name} with a fatal shot!`, "combat_kill", elapsedSeconds));
            defender.isDead = true;
          } else {
            if (getFatalSurviveChance(pmc.classType) > 0 && Math.random() < getFatalSurviveChance(pmc.classType)) {
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
  pmc.isCovered = pmcView.isCovered;
  pmc.isDead = pmcView.isDead;

  enemy.isBleeding = enemyView.isBleeding;
  enemy.isCovered = enemyView.isCovered;
  enemy.isDead = enemyView.isDead;

  return roundLogs;
};

/** Synchronously drains the combat generator and returns the round logs. */
export const simulateCombatRound = (
  pmc: PMCCharacter, enemy: EnemyState, weapon: Weapon, weaponStats: any, elapsedSeconds: number, raid: RaidState, shootingRangeLevel: number, context: EngineContext
): RaidLog[] => {
  const gen = simulateCombatRoundGenerator(pmc, enemy, weapon, weaponStats, elapsedSeconds, raid, shootingRangeLevel, context);
  let result = gen.next();
  while (!result.done) result = gen.next();
  return result.value;
};

/**
 * AsyncGenerator variant of the combat round, delegating to the sync
 * generator. Future async consumers (UI tick loop, Phase 4 interceptors)
 * advance this generator to observe `InterruptHook`s without changing the
 * simulation outcome.
 */
export const simulateCombatRoundAsync = async function* (
  pmc: PMCCharacter, enemy: EnemyState, weapon: Weapon, weaponStats: any, elapsedSeconds: number, raid: RaidState, shootingRangeLevel: number, context: EngineContext
): AsyncGenerator<InterruptHook, RaidLog[], unknown> {
  return yield* simulateCombatRoundGenerator(pmc, enemy, weapon, weaponStats, elapsedSeconds, raid, shootingRangeLevel, context);
};
