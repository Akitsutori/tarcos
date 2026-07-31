/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hideout module plugin seam. RAID_END_MODULES is the registry of ModuleInstance
 * listeners that run after a raid terminates; the dispatch helper is wired into
 * every AFTER_RAID_END exit of runRaidTickGenerator.
 *
 * The registry is intentionally EMPTY: no game-feature module ships yet. The
 * Scavenger Workstation (AFTER_RAID_END listener + STASH_ADD intent) is deferred
 * until the architectural refactor settles, then added here as the reality check.
 */

import { GameState } from "../../types";
import { EngineContext, InterruptHook, ModuleInstance } from "../types";

export const RAID_END_MODULES: ModuleInstance[] = [];

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
