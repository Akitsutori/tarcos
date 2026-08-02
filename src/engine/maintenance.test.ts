import { describe, it, expect } from 'vitest';
import { executeMaintenancePhase } from './maintenance';
import { createInitialPMC } from '../data/construction';
import { ALL_ITEMS } from '../data/content/items';
import { ClassType, PMCBodyParts, PMCCharacter, RaidState } from '../types';

const makeBodyParts = (blacked: Partial<Record<keyof PMCBodyParts, boolean>>): PMCBodyParts => ({
  head: { id: "head", name: "Head", current: blacked.head ? 0 : 35, max: 35 },
  thorax: { id: "thorax", name: "Thorax", current: blacked.thorax ? 0 : 85, max: 85 },
  stomach: { id: "stomach", name: "Stomach", current: blacked.stomach ? 0 : 70, max: 70 },
  leftArm: { id: "leftArm", name: "Left Arm", current: 60, max: 60 },
  rightArm: { id: "rightArm", name: "Right Arm", current: 60, max: 60 },
  leftLeg: { id: "leftLeg", name: "Left Leg", current: 65, max: 65 },
  rightLeg: { id: "rightLeg", name: "Right Leg", current: 65, max: 65 },
});

const makePmc = (blacked: Partial<Record<keyof PMCBodyParts, boolean>>): PMCCharacter => {
  const pmc = createInitialPMC(ClassType.SOLDIER);
  pmc.bodyParts = makeBodyParts(blacked);
  pmc.equippedMedkit = null;
  pmc.equippedSurgicalKit = null;
  pmc.equippedProvision = null;
  pmc.equippedArmor = null;
  pmc.equippedHelmet = null;
  pmc.isBleeding = false;
  pmc.hydration = 100;
  pmc.energy = 100;
  return pmc;
};

const makeRaid = (): RaidState => ({
  isActive: true,
  map: null,
  tiles: [],
  currentStage: 0,
  status: "scavenging",
  combatTarget: null,
  logs: [],
  lootFound: [],
  secureContainerSaved: [],
  elapsedSeconds: 0,
  playSpeed: 1,
  usedMedkitDuringRaid: false,
  reinforcementsSpawnedThisTile: 0,
  killsByTier: { Scav: 0, PMC: 0, Boss: 0 },
});

describe("executeMaintenancePhase surgical repair", () => {
  it("patches a blacked-out thorax to 1 HP and consumes one charge", () => {
    const pmc = makePmc({ thorax: true });
    pmc.equippedSurgicalKit = { ...ALL_ITEMS.cms_kit };
    const raid = makeRaid();

    executeMaintenancePhase(pmc, raid);

    expect(pmc.bodyParts.thorax.current).toBe(1);
    expect(pmc.equippedSurgicalKit?.resourceCurrent).toBe(ALL_ITEMS.cms_kit.resourceCurrent! - 1);
  });

  it("patches a blacked-out head to 1 HP", () => {
    const pmc = makePmc({ head: true });
    pmc.equippedSurgicalKit = { ...ALL_ITEMS.cms_kit };
    const raid = makeRaid();

    executeMaintenancePhase(pmc, raid);

    expect(pmc.bodyParts.head.current).toBe(1);
  });

  it("repairs vital parts before limbs when charges are limited", () => {
    const pmc = makePmc({ thorax: true, stomach: true });
    pmc.equippedSurgicalKit = { ...ALL_ITEMS.cms_kit, resourceCurrent: 1, resourceMax: 1 };
    const raid = makeRaid();

    executeMaintenancePhase(pmc, raid);

    expect(pmc.bodyParts.thorax.current).toBe(1);
    expect(pmc.bodyParts.stomach.current).toBe(0);
    expect(pmc.equippedSurgicalKit?.resourceCurrent).toBe(0);
  });

  it("does not let a medkit heal a blacked-out thorax without surgery first", () => {
    const pmc = makePmc({ thorax: true });
    pmc.equippedMedkit = { ...ALL_ITEMS.ai2 };
    const raid = makeRaid();

    executeMaintenancePhase(pmc, raid);

    expect(pmc.bodyParts.thorax.current).toBe(0);
  });
});
