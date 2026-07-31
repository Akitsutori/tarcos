/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hideout module plugin seam. RAID_END_MODULES is the registry of ModuleInstance
 * listeners that run after a raid terminates; the dispatch helper is wired into
 * every AFTER_RAID_END exit of runRaidTickGenerator.
 *
 * Ships the Scavenger Workstation — the deferred reality check for the seam:
 * an AFTER_RAID_END listener that, on a successful extraction, emits a
 * level-scaled STASH_ADD reward through the intent pipeline, gated by module
 * level and a raid-count cooldown.
 */

import { GameState } from "../../types";
import { EngineContext, InterruptHook, ModuleInstance } from "../types";
import {
  computeScavengerWorkstationQuantity,
  SCAVENGER_WORKSTATION_COOLDOWN_RAIDS,
  SCAVENGER_WORKSTATION_REWARD_BY_LEVEL,
} from "../../data/tuning/hideoutConfig";

export const scavengerWorkstationModule: ModuleInstance = {
  id: "scavengerWorkstation",
  canExecute(state) {
    const workstation = state.hideout?.scavengerWorkstation;
    if (!workstation || workstation.level < 1) return false;
    if (state.activeRaid.status !== "extracted") return false;
    const lastProduced = workstation.lastProducedAtRaidIndex ?? -SCAVENGER_WORKSTATION_COOLDOWN_RAIDS;
    return state.pmc.raidsCount - lastProduced >= SCAVENGER_WORKSTATION_COOLDOWN_RAIDS;
  },
  onRaidEnd(state, _hook, context) {
    const workstation = state.hideout.scavengerWorkstation;
    const reward = SCAVENGER_WORKSTATION_REWARD_BY_LEVEL[workstation.level];
    if (!reward) return;
    const quantity = computeScavengerWorkstationQuantity(
      reward.baseQuantity,
      state.pmc.skills.perception.level,
      state.activeRaid.map?.lootMultiplier ?? 1,
    );
    context.emitIntent({
      targetEntityId: "stash",
      type: "STASH_ADD",
      value: { itemId: reward.itemId, quantity },
    });
    workstation.lastProducedAtRaidIndex = state.pmc.raidsCount;
  },
};

export const RAID_END_MODULES: ModuleInstance[] = [scavengerWorkstationModule];

export function dispatchRaidEndModules(
  state: GameState,
  hook: InterruptHook,
  context: EngineContext,
  modules: readonly ModuleInstance[] = RAID_END_MODULES,
): void {
  for (const module of modules) {
    if (module.canExecute(state)) {
      module.onRaidEnd(state, hook, context);
    }
  }
}
