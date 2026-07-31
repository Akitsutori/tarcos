import { ClassType, Weapon } from "../../types";

// Weapons Specifications exactly as GDD Section 7.1
export const INITIAL_WEAPONS: { [key in ClassType]: Weapon } = {
  [ClassType.SOLDIER]: {
    id: "assault_rifle",
    name: "Assault Rifle (7.62x39mm)",
    baseErgo: 50,
    baseRecoil: 85,
    baseDmg: 50, // Matches 7.62x39mm PP ammo damage
    baseAccuracy: 50, // Weapon Base from GDD
    mods: {},
    signatureClass: ClassType.SOLDIER,
    caliber: "7.62x39mm",
    currentMagRounds: 30,
    maxMagSize: 30,
    reserveMags: 3,
    maxReserveMags: 3
  },
  [ClassType.SCOUT]: {
    id: "smg",
    name: "SMG (9x19mm)",
    baseErgo: 65,
    baseRecoil: 45,
    baseDmg: 28, // PBP ammo base
    baseAccuracy: 45,
    mods: {},
    signatureClass: ClassType.SCOUT,
    caliber: "9x19mm",
    currentMagRounds: 30,
    maxMagSize: 30,
    reserveMags: 3, // Scout gets overwritten to 4 in code
    maxReserveMags: 3
  },
  [ClassType.SURVIVOR]: {
    id: "shotgun",
    name: "Shotgun (12x70mm)",
    baseErgo: 44,
    baseRecoil: 105,
    baseDmg: 65, // Slug base
    baseAccuracy: 40,
    mods: {},
    signatureClass: ClassType.SURVIVOR,
    caliber: "12x70mm",
    currentMagRounds: 6,
    maxMagSize: 6,
    reserveMags: 2,
    maxReserveMags: 2
  },
  [ClassType.MARKSMAN]: {
    id: "marksman_rifle",
    name: "Marksman Rifle (7.62x54mm)",
    baseErgo: 35,
    baseRecoil: 140,
    baseDmg: 75, // SNB base
    baseAccuracy: 70,
    mods: {},
    signatureClass: ClassType.MARKSMAN,
    caliber: "7.62x54mm",
    currentMagRounds: 10,
    maxMagSize: 10,
    reserveMags: 2,
    maxReserveMags: 2
  },
  [ClassType.LUCKY]: {
    id: "lmg",
    name: "LMG (7.62x39mm)",
    baseErgo: 30,
    baseRecoil: 120,
    baseDmg: 57, // PS base
    baseAccuracy: 45,
    mods: {},
    signatureClass: ClassType.LUCKY,
    caliber: "7.62x39mm",
    currentMagRounds: 45,
    maxMagSize: 45,
    reserveMags: 2,
    maxReserveMags: 2
  }
};
