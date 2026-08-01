import { PMCBodyParts } from "../types";

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
