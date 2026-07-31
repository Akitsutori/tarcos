/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem } from "../../types";

/**
 * Medical/healing tuning: backup item search predicates and cost constants.
 * Consumed by engine/maintenance.ts as the single source of truth for
 * finding replacement medkits, surgical kits, and provisions.
 */

export type BackupItemKind = "surgical" | "medkit" | "provision";

export type LootEntry = { item: GameItem; quantity: number };

const matchesKind = (item: GameItem, kind: BackupItemKind): boolean => {
  switch (kind) {
    case "surgical":
      return item.type === "medical" && item.medicalSubType === "surgical";
    case "medkit":
      return item.type === "medical" && item.medicalSubType === "medkit";
    case "provision":
      return item.type === "provision";
  }
};

/**
 * Finds the first loot entry that can act as a backup for the given item kind,
 * with at least `minResource` resource points remaining.
 *
 * @param entries The raid's found-loot list
 * @param kind Which backup item kind to search for
 * @param minResource Minimum remaining resource points (default 1)
 * @returns The index of the matching entry, or -1 if none qualifies
 */
export const findBackupMedical = (entries: LootEntry[], kind: BackupItemKind, minResource = 1): number => {
  return entries.findIndex(e => matchesKind(e.item, kind) && !!e.item.resourceCurrent && e.item.resourceCurrent >= minResource);
};

/**
 * Consumes one unit of the loot entry at `index` (decrementing the stack, or
 * removing it entirely when it was the last copy). Mutates `entries`.
 */
export const consumeFoundEntry = (entries: LootEntry[], index: number): void => {
  if (entries[index].quantity > 1) entries[index].quantity--;
  else entries.splice(index, 1);
};

// Resource cost to stop an arterial bleed with a medkit
export const BLEED_STOP_COST = 20;

// Fallback HP restored per heal application when the medkit has no hpHeal stat
export const DEFAULT_HEAL_RESTORE = 25;

// Max passes of the maintenance heal loop before it gives up
export const MAINTENANCE_HEAL_ATTEMPTS = 5;
