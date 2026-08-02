import { PMCBodyParts, PMCCharacter } from "../types";
import { calculateBodyParts } from "../data/construction";

/**
 * Canonical iteration order for the PMC body, matching golden-transcript
 * serialization and the combat generator's target-roll table. Keep in sync
 * with anything that persists body HP as an ordered list.
 */
export const BODY_PART_ORDER: readonly (keyof PMCBodyParts)[] = ["head", "thorax", "stomach", "leftArm", "rightArm", "leftLeg", "rightLeg"];

/**
 * Medkit/medstation heal priority: head -> thorax -> stomach -> legs -> arms.
 * Deliberately differs from BODY_PART_ORDER (arms before legs); the two
 * orders must not be silently merged.
 */
export const HEAL_PART_ORDER: readonly (keyof PMCBodyParts)[] = ["head", "thorax", "stomach", "leftLeg", "rightLeg", "leftArm", "rightArm"];

/**
 * Surgical-kit repair priority: blacked-out stomach/legs first, then arms.
 */
export const SURGICAL_TARGET_ORDER: readonly (keyof PMCBodyParts)[] = ["stomach", "leftLeg", "rightLeg", "leftArm", "rightArm"];

/**
 * Combat damage-spillover priority (blacked-out limb redistribution):
 * stomach -> arms -> legs. Distinct from SURGICAL_TARGET_ORDER on purpose.
 */
export const DAMAGE_SPILLOVER_ORDER: readonly (keyof PMCBodyParts)[] = ["stomach", "leftArm", "rightArm", "leftLeg", "rightLeg"];

/** Total current HP summed over all body parts, in BODY_PART_ORDER. */
export const totalCurrentHp = (parts: PMCBodyParts): number =>
  BODY_PART_ORDER.reduce((acc, part) => acc + parts[part].current, 0);

/** Total max HP summed over all body parts, in BODY_PART_ORDER. */
export const totalMaxHp = (parts: PMCBodyParts): number =>
  BODY_PART_ORDER.reduce((acc, part) => acc + parts[part].max, 0);

/**
 * Applies the PMC's current constitution level to their body part max HP,
 * preserving injury: max grows and current rises by exactly the delta gained.
 * Never reduces max HP below its current value. Idempotent when body parts
 * already match the current constitution level. Single source of truth for
 * constitution HP scaling on the PMC.
 */
export const applyConstitutionHealth = (pmc: PMCCharacter): void => {
  const next = calculateBodyParts(pmc.skills.constitution.level);
  for (const partId of BODY_PART_ORDER) {
    const part = pmc.bodyParts[partId];
    const growth = Math.max(0, next[partId].max - part.max);
    part.max = Math.max(part.max, next[partId].max);
    part.current = Math.min(part.max, part.current + growth);
  }
};
