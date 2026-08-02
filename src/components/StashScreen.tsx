/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { GameState, GameItem, ItemType } from "../types";
import { ALL_ITEMS } from "../data/content/items";
import { MEDSTATION_HEAL_PER_5S_BY_LEVEL } from "../data/tuning/hideoutConfig";
import { BodyMap } from "./BodyMap";
import { totalCurrentHp, totalMaxHp } from "../engine/bodyParts";
import { isArmorItem } from "../engine/lootManagement";
import { Coins, PackageOpen, Heart, Zap, Droplet, Shield } from "lucide-react";
import { Card } from "../ui/Card";
import { PanelHeader } from "../ui/PanelHeader";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { DurabilityBar } from "../ui/DurabilityBar";
import { StatChip } from "../ui/StatChip";
import { SectionLabel } from "../ui/SectionLabel";
import { ScrollPane } from "../ui/ScrollPane";

interface StashScreenProps {
  gameState: GameState;
  onSellItem: (itemId: string, quantity: number) => void;
  onSellArmor: (stashIndex: number, quantity: number) => void;
  onBuyItem: (itemId: string, cost: number) => void;
  onConsumeItem: (itemId: string) => void;
  onEquipWeapon: (weaponId: string) => void;
  onEquipArmor: (stashIndex: number) => void;
}

// Rarity styling for item badges (kept as a domain palette, not a token).
const getRarityBadgeStyle = (rarity: GameItem["rarity"]) => {
  switch (rarity) {
    case "legendary":
      return "bg-yellow-950/40 text-yellow-400 border-yellow-800";
    case "epic":
      return "bg-purple-950/40 text-purple-400 border-purple-800";
    case "rare":
      return "bg-cyan-950/40 text-cyan-400 border-cyan-800";
    default:
      return "bg-slate-950/60 text-slate-400 border-slate-800";
  }
};

// Loadout chip for the stat strip (armor/helmet durability at a glance).
const renderLoadoutChip = (label: string, piece: GameItem | null) => {
  if (!piece || piece.maxDurability === undefined || piece.maxDurability <= 0) {
    return (
      <StatChip tone="danger">
        <Shield size={12} /> No {label}
      </StatChip>
    );
  }
  const percent = (piece.durability ?? 0) / piece.maxDurability;
  const tone: "good" | "warn" | "crit" = percent >= 0.6 ? "good" : percent >= 0.25 ? "warn" : "crit";
  return (
    <StatChip tone={tone}>
      <Shield size={12} /> {label} · Class {piece.armorClass} · {Math.round(percent * 100)}%
    </StatChip>
  );
};

// A medkit-parity armor/helmet stash stack (one card per piece id; the shown
// item is the lowest-durability piece, owned = quantity + 1).
const ArmorPieceCard: React.FC<{
  item: GameItem;
  stashIndex: number;
  quantity: number;
  onEquip: () => void;
  onSell: () => void;
  onSellAll: () => void;
}> = ({ item, stashIndex, quantity, onEquip, onSell, onSellAll }) => {
  const hasDurability = item.durability !== undefined && item.maxDurability !== undefined && item.maxDurability > 0;
  const owned = quantity + 1;

  return (
    <div className="p-3 border rounded-card flex flex-col justify-between transition bg-panel-2 border-border hover:border-border-soft">
      <div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-strong font-bold line-clamp-1 text-fg">{item.name}</span>
          <span className={`px-2 py-0.5 rounded-control text-label font-bold font-mono uppercase border shrink-0 ${getRarityBadgeStyle(item.rarity)}`}>
            {item.rarity}
          </span>
        </div>
        <p className="text-body text-fg-low mt-1 line-clamp-2 min-h-[30px]">{item.description}</p>
      </div>

      {hasDurability && (
        <DurabilityBar
          className="mt-2"
          label={`Durability${item.armorClass ? ` (Class ${item.armorClass})` : ""}`}
          statusText={`${item.durability}/${item.maxDurability}`}
          current={item.durability ?? 0}
          max={item.maxDurability ?? 1}
        />
      )}

      <div className="border-t border-border mt-3 pt-2.5 flex items-center justify-between gap-2">
        <div className="font-mono text-meta whitespace-nowrap">
          <span className="text-fg-low">Qty:</span> <span className="text-fg font-bold">{owned}</span>
          <span className="text-fg-faint mx-1.5">|</span>
          <span className="text-fg-low">Sell:</span> <span className="text-accent font-bold">₽{item.value}</span>
        </div>
        <div className="flex gap-1">
          <Button id={`equip-armor-btn-${item.id}-${stashIndex}`} variant="info" onClick={onEquip}>
            EQUIP
          </Button>
          <Button id={`sell-armor-btn-${item.id}-${stashIndex}`} variant="sell" onClick={onSell}>
            SELL 1
          </Button>
          {owned > 1 && (
            <Button id={`sell-armor-all-btn-${item.id}-${stashIndex}`} variant="sell" onClick={onSellAll}>
              ALL
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// A stacked/market row for non-armor items.
const ItemCard: React.FC<{
  item: GameItem;
  owned: number;
  buyable: boolean;
  resourceLowest?: number;
  resourceMax?: number;
  stashRoubles: number;
  onBuy: () => void;
  onConsume: () => void;
  onSellOne: () => void;
  onSellAll: () => void;
}> = ({ item, owned, buyable, resourceLowest, resourceMax, stashRoubles, onBuy, onConsume, onSellOne, onSellAll }) => {
  const isOwned = owned > 0;
  const isConsumable = item.type === "medical" || item.type === "provision";
  const isMedkit = item.medicalSubType === "medkit";
  const isSurgicalKit = item.medicalSubType === "surgical";
  const hasResource = isMedkit || isSurgicalKit || item.type === "provision";
  const isAffordable = buyable && stashRoubles >= (item.traderCost ?? 0);
  const hasDurability = item.durability !== undefined && item.maxDurability !== undefined && item.maxDurability > 0;
  const resourcePercent = hasResource && resourceMax && resourceMax > 0 && resourceLowest !== undefined ? resourceLowest / resourceMax : null;
  const canUse = isOwned && isConsumable && !(hasResource && resourceLowest !== undefined && resourceLowest <= 0);

  return (
    <div className={`p-3 border rounded-card flex flex-col justify-between transition ${
      isOwned ? "bg-panel-2 border-border hover:border-border-soft" : "bg-panel-2/60 border-border/60 hover:border-border-soft/60"
    }`}>
      <div>
        <div className="flex justify-between items-start gap-2">
          <span className={`text-strong font-bold line-clamp-1 ${isOwned ? "text-fg" : "text-fg-mid"}`}>{item.name}</span>
          <span className={`px-2 py-0.5 rounded-control text-label font-bold font-mono uppercase border shrink-0 ${getRarityBadgeStyle(item.rarity)}`}>
            {item.rarity}
          </span>
        </div>
        <p className="text-body text-fg-low mt-1 line-clamp-2 min-h-[30px]">{item.description}</p>
      </div>

      {isOwned && hasResource && resourcePercent !== null && (
        <DurabilityBar
          className="mt-2"
          label={isSurgicalKit ? "Uses" : item.provisionType === "hydration" ? "Hydration" : item.provisionType === "energy" ? "Energy" : "Capacity"}
          statusText={`${resourceLowest}/${resourceMax}`}
          current={resourceLowest ?? 0}
          max={resourceMax ?? 1}
        />
      )}

      {isOwned && hasDurability && (
        <DurabilityBar
          className="mt-2"
          label={`Durability${item.armorClass ? ` (Class ${item.armorClass})` : ""}`}
          statusText={`${item.durability}/${item.maxDurability}`}
          current={item.durability ?? 0}
          max={item.maxDurability ?? 1}
        />
      )}

      <div className="border-t border-border mt-3 pt-2.5 flex items-center justify-between gap-2">
        <div className="font-mono text-meta whitespace-nowrap">
          {isOwned ? (
            <>
              <span className="text-fg-low">Qty:</span> <span className="text-fg font-bold">{owned}</span>
              <span className="text-fg-faint mx-1.5">|</span>
              <span className="text-fg-low">Sell:</span> <span className="text-accent font-bold">₽{item.value}</span>
            </>
          ) : (
            <>
              <span className="text-fg-low">Not owned</span>
              {buyable && (
                <>
                  <span className="text-fg-faint mx-1.5">|</span>
                  <span className="text-fg-low">Buy:</span> <span className="text-accent font-bold">₽{(item.traderCost ?? 0).toLocaleString()}</span>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex gap-1">
          {buyable && (
            <Button id={`buy-btn-${item.id}`} variant="accent" onClick={onBuy} disabled={!isAffordable}>
              BUY
            </Button>
          )}

          {canUse && (
            <Button
              id={`consume-btn-${item.id}`}
              variant="success"
              onClick={onConsume}
              title={isSurgicalKit ? "Fix one blacked-out limb" : isMedkit ? "Heal all damaged body parts" : "Consume to restore hydration/energy"}
            >
              USE
            </Button>
          )}

          {isOwned && (
            <>
              <Button id={`sell-btn-${item.id}`} variant="sell" onClick={onSellOne}>
                SELL 1
              </Button>
              {owned > 1 && (
                <Button id={`sell-all-btn-${item.id}`} variant="sell" onClick={onSellAll}>
                  ALL
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const StashScreen: React.FC<StashScreenProps> = ({
  gameState,
  onSellItem,
  onSellArmor,
  onBuyItem,
  onConsumeItem,
  onEquipWeapon,
  onEquipArmor
}) => {
  const { stash, pmc, hideout } = gameState;

  // Compute total current and max HP across all body parts
  const totalCurrentHP = pmc.bodyParts ? totalCurrentHp(pmc.bodyParts) : 0;
  const totalMaxHP = pmc.bodyParts ? totalMaxHp(pmc.bodyParts) : 100;
  const hpPercent = totalMaxHP > 0 ? (totalCurrentHP / totalMaxHP) * 100 : 0;
  const [activeCategory, setActiveCategory] = useState<ItemType | "all">("all");

  // Unified item list: owned items + buyable items from traders.
  // Armor/helmet are medkit-parity stacks (one card per piece id, owned =
  // quantity + 1, shown item is the lowest-durability piece); everything else
  // aggregates by id.
  const { armorPieces, aggregatedRows } = useMemo(() => {
    const armorPieces: {
      item: GameItem;
      stashIndex: number;
      quantity: number;
    }[] = [];
    const nonArmorEntries: { item: GameItem; quantity: number }[] = [];

    stash.items.forEach((entry, index) => {
      if (isArmorItem(entry.item)) armorPieces.push({ item: entry.item, stashIndex: index, quantity: entry.quantity });
      else nonArmorEntries.push(entry);
    });

    const ownedMap = new Map<string, number>();
    const resourceMap = new Map<string, { lowest: number; max: number }>();
    for (const entry of nonArmorEntries) {
      const isActive = entry.item.resourceCurrent !== undefined && entry.item.resourceCurrent > 0;
      const hasBackups = entry.quantity > 0;
      if (!isActive && !hasBackups) continue;

      const totalOwned = entry.quantity + 1;
      ownedMap.set(entry.item.id, (ownedMap.get(entry.item.id) ?? 0) + totalOwned);

      const rc = entry.item.resourceCurrent ?? 0;
      const rm = entry.item.resourceMax ?? 0;
      const existing = resourceMap.get(entry.item.id);
      if (existing) {
        if (rc < existing.lowest) existing.lowest = rc;
      } else {
        resourceMap.set(entry.item.id, { lowest: rc, max: rm });
      }
    }

    const aggregatedRows: {
      item: GameItem;
      owned: number;
      buyable: boolean;
      resourceLowest?: number;
      resourceMax?: number;
    }[] = [];

    // Buyable items (show even if not owned)
    for (const item of Object.values(ALL_ITEMS)) {
      if (item.soldBy && item.traderCost) {
        const res = resourceMap.get(item.id);
        aggregatedRows.push({
          item,
          owned: ownedMap.get(item.id) ?? 0,
          buyable: true,
          resourceLowest: res?.lowest,
          resourceMax: res?.max,
        });
      }
    }

    // Owned items that are NOT buyable
    for (const entry of nonArmorEntries) {
      if (entry.quantity > 0 && !(entry.item.soldBy && entry.item.traderCost)) {
        const existing = aggregatedRows.find(r => r.item.id === entry.item.id);
        if (!existing) {
          const res = resourceMap.get(entry.item.id);
          aggregatedRows.push({
            item: entry.item,
            owned: entry.quantity,
            buyable: false,
            resourceLowest: res?.lowest,
            resourceMax: res?.max,
          });
        }
      }
    }

    return { armorPieces, aggregatedRows };
  }, [stash.items]);

  // Filter by category
  const filteredArmorPieces = armorPieces.filter(({ item }) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "armor") return true;
    return false;
  });

  const filteredRows = aggregatedRows.filter(({ item }) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "armor") return item.type === "armor" || item.type === "helmet";
    return item.type === activeCategory;
  });

  // Live counts per category for the selector
  const countsByCategory = useMemo(() => {
    const count = (cat: ItemType | "all") => {
      const armorCount = cat === "all" || cat === "armor" ? armorPieces.length : 0;
      const rowCount = aggregatedRows.filter(({ item }) => {
        if (cat === "all") return true;
        if (cat === "armor") return item.type === "armor" || item.type === "helmet";
        return item.type === cat;
      }).length;
      return armorCount + rowCount;
    };
    return {
      all: count("all"),
      barter: count("barter"),
      medical: count("medical"),
      provision: count("provision"),
      weapon_mod: count("weapon_mod"),
      armor: count("armor"),
    };
  }, [armorPieces, aggregatedRows]);

  // Compute total stash value
  const totalStashValue = stash.items.reduce((acc, entry) => acc + (entry.item.value * entry.quantity), 0) + stash.roubles;

  return (
    <div id="stash-screen" className="flex flex-col gap-4 lg:h-app-viewport lg:overflow-hidden">

      {/* COMPACT STAT STRIP */}
      <Card id="stash-vitals-card" padding="sm" className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 shrink-0">
        <div className="flex items-center gap-5">
          <div>
            <SectionLabel className="flex items-center gap-1.5">
              <Coins size={12} className="text-accent" />
              Liquid Reserves
            </SectionLabel>
            <div className="text-stat font-black text-accent font-mono leading-tight whitespace-nowrap">
              ₽{stash.roubles.toLocaleString()}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <SectionLabel>Net Worth</SectionLabel>
            <div className="text-title font-bold text-fg font-mono leading-tight whitespace-nowrap">
              ₽{totalStashValue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* EQUIPPED LOADOUT CHIPS */}
        <div className="flex items-center gap-2 flex-wrap">
          <SectionLabel className="mr-1">Loadout</SectionLabel>
          {renderLoadoutChip("Armor", pmc.equippedArmor)}
          {renderLoadoutChip("Helmet", pmc.equippedHelmet)}
        </div>
      </Card>

      {/* MAIN CONTENT: 2/3 INVENTORY + 1/3 SIDEBAR (proportional, fills the app-viewport) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:flex-1 lg:min-h-0 gap-4">
        {/* STASH ITEMS SECTION */}
        <div className="bg-panel border border-border rounded-card p-4 flex flex-col min-h-[400px] lg:min-h-0 min-w-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border pb-3 mb-3">
            <h3 className="text-title font-bold text-fg-hi font-mono uppercase tracking-wide flex items-center gap-2">
              <PackageOpen size={16} className="text-accent" />
              Inventory & Market
            </h3>

            {/* CATEGORY SELECTOR — items first; the backdrop is just a background
                effect on all pills. Spacing comes from the --cat-* tokens so the
                bar adapts to available width (pills wrap, never scroll). */}
            <div
              id="stash-cat-bar"
              className="flex flex-wrap gap-(--cat-gap) bg-panel-2 p-(--cat-bar-pad) rounded-control border border-border w-fit max-w-full"
            >
              {(["all", "barter", "medical", "provision", "weapon_mod", "armor"] as const).map((cat) => (
                <button
                  id={`stash-cat-${cat}-btn`}
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-(--cat-pill-x) py-(--cat-pill-y) text-label font-mono font-bold rounded-control capitalize transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    activeCategory === cat ? "bg-panel-hi text-accent" : "text-fg-low hover:text-fg-mid"
                  }`}
                >
                  {cat === "all" ? "All" : cat.replace("_", " ")}
                  <span className={`px-1 rounded text-label ${activeCategory === cat ? "bg-panel-2 text-accent" : "bg-panel text-fg-low"}`}>
                    {countsByCategory[cat]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredArmorPieces.length === 0 && filteredRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-fg-low py-12">
              <PackageOpen size={40} className="text-fg-faint mb-3" />
              <span className="text-strong font-mono italic">No items to display.</span>
              <span className="text-meta text-fg-faint font-mono mt-1">Deploy on raids to scavenge supplies or buy from market.</span>
            </div>
          ) : (
            <div id="stash-grid" className="grid grid-cols-items gap-3 pr-1 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              {/* Armor/helmet stacks: one card per piece id (owned = quantity + 1) */}
              {filteredArmorPieces.map(({ item, stashIndex, quantity }) => (
                <ArmorPieceCard
                  key={`armor-piece-${stashIndex}`}
                  item={item}
                  stashIndex={stashIndex}
                  quantity={quantity}
                  onEquip={() => onEquipArmor(stashIndex)}
                  onSell={() => onSellArmor(stashIndex, 1)}
                  onSellAll={() => onSellArmor(stashIndex, quantity + 1)}
                />
              ))}

              {/* Stacked/market rows for non-armor items */}
              {filteredRows.map(({ item, owned, buyable, resourceLowest, resourceMax }) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={owned}
                  buyable={buyable}
                  resourceLowest={resourceLowest}
                  resourceMax={resourceMax}
                  stashRoubles={stash.roubles}
                  onBuy={() => onBuyItem(item.id, item.traderCost ?? 0)}
                  onConsume={() => onConsumeItem(item.id)}
                  onSellOne={() => onSellItem(item.id, 1)}
                  onSellAll={() => onSellItem(item.id, owned)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: VITALS -> EQUIPPED ARMOR -> WEAPONS VAULT (scrolls as one bounded column) */}
        <div id="stash-sidebar" className="space-y-4 flex flex-col lg:min-h-0 lg:overflow-y-auto min-w-0">

          {/* PMC REAL-TIME VITAL MONITOR CARD */}
          <Card id="stash-pmc-vitals-card" className="shrink-0">
            <PanelHeader
              title="PMC Vitals Monitor"
              icon={<Heart size={16} className="text-good fill-good animate-pulse" />}
            />

            {/* OVERALL HEALTH INTEGRITY */}
            <div className="mb-2.5">
              <div className="flex justify-between items-center text-strong font-mono mb-1.5">
                <span className="text-fg-mid font-bold">Overall Integrity</span>
                <span className={`font-bold ${totalCurrentHP === totalMaxHP ? "text-good" : "text-warn"}`}>
                  {totalCurrentHP} / {totalMaxHP} HP
                </span>
              </div>
              <div className="h-2.5 bg-panel-2 rounded-pill p-[2px] border border-border/80 overflow-hidden">
                <div
                  className={`h-full rounded-pill transition-all duration-300 ${hpPercent >= 85 ? "bg-good" : hpPercent >= 45 ? "bg-warn" : "bg-crit"}`}
                  style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
                />
              </div>
            </div>

            {/* 7-ZONE LIMBS HP MATRIX */}
            <div className="border-t border-border/60 pt-2.5 mb-2.5">
              <SectionLabel className="mb-2">7-Zone Body Integrity Matrix</SectionLabel>
              {pmc.bodyParts && <BodyMap bodyParts={pmc.bodyParts} />}
            </div>

            {/* ENERGY & HYDRATION STATUS */}
            <div className="grid grid-cols-2 gap-2.5 border-t border-border/60 pt-2.5">
              <div className="p-2 bg-panel-2 rounded-control border border-border/80">
                <div className="flex justify-between items-center text-meta font-mono mb-1">
                  <span className="text-fg-mid flex items-center gap-1">
                    <Zap size={11} className="text-accent fill-accent" />
                    Energy
                  </span>
                  <span className="text-accent font-bold">{pmc.energy}%</span>
                </div>
                <div className="h-1 bg-panel rounded-pill overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, pmc.energy))}%` }} />
                </div>
              </div>

              <div className="p-2 bg-panel-2 rounded-control border border-border/80">
                <div className="flex justify-between items-center text-meta font-mono mb-1">
                  <span className="text-fg-mid flex items-center gap-1">
                    <Droplet size={11} className="text-info fill-info" />
                    Hydration
                  </span>
                  <span className="text-info font-bold">{pmc.hydration}%</span>
                </div>
                <div className="h-1 bg-panel rounded-pill overflow-hidden">
                  <div className="h-full bg-info transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, pmc.hydration))}%` }} />
                </div>
              </div>
            </div>

            {/* PASSIVE RECOVERY BADGE */}
            {totalCurrentHP < totalMaxHP && (
              <div className="mt-2 p-1.5 bg-good/20 border border-good/40 rounded-control text-meta font-mono text-good flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-good animate-ping" />
                <span>Passive recovery active (+{MEDSTATION_HEAL_PER_5S_BY_LEVEL[hideout.medstation?.level ?? 0]} HP/5s)</span>
              </div>
            )}
          </Card>

          {/* EQUIPPED ARMOR CARD */}
          <Card id="stash-armor-card" className="shrink-0">
            <PanelHeader title="Equipped Armor" />

            <div className="space-y-2">
              {/* Body Armor */}
              <div className={`p-2 rounded-control border ${pmc.equippedArmor ? "bg-panel-2 border-info" : "bg-panel-2/60 border-border/60"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-meta text-fg-low font-mono font-bold uppercase">Body Armor</span>
                  {pmc.equippedArmor && <Badge tone="info">Equipped</Badge>}
                </div>
                {pmc.equippedArmor ? (
                  <div>
                    <span className="text-strong font-bold text-fg-hi block">{pmc.equippedArmor.name}</span>
                    <div className="text-meta text-fg-low font-mono mt-1">
                      Class <span className="text-fg">{pmc.equippedArmor.armorClass}</span>
                      <span className="mx-1.5">|</span>
                      Zones: <span className="text-fg">{pmc.equippedArmor.protectedZones?.join(", ") || "—"}</span>
                    </div>
                    {pmc.equippedArmor.durability !== undefined && pmc.equippedArmor.maxDurability !== undefined && (
                      <DurabilityBar
                        className="mt-1.5"
                        label="Durability"
                        statusText={`${pmc.equippedArmor.durability}/${pmc.equippedArmor.maxDurability}`}
                        current={pmc.equippedArmor.durability}
                        max={pmc.equippedArmor.maxDurability}
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-meta text-fg-faint font-mono italic">No body armor equipped</span>
                )}
              </div>

              {/* Helmet */}
              <div className={`p-2 rounded-control border ${pmc.equippedHelmet ? "bg-panel-2 border-info" : "bg-panel-2/60 border-border/60"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-meta text-fg-low font-mono font-bold uppercase">Helmet</span>
                  {pmc.equippedHelmet && <Badge tone="info">Equipped</Badge>}
                </div>
                {pmc.equippedHelmet ? (
                  <div>
                    <span className="text-strong font-bold text-fg-hi block">{pmc.equippedHelmet.name}</span>
                    <div className="text-meta text-fg-low font-mono mt-1">
                      Class <span className="text-fg">{pmc.equippedHelmet.armorClass}</span>
                      <span className="mx-1.5">|</span>
                      Zones: <span className="text-fg">{pmc.equippedHelmet.protectedZones?.join(", ") || "—"}</span>
                    </div>
                    {pmc.equippedHelmet.durability !== undefined && pmc.equippedHelmet.maxDurability !== undefined && (
                      <DurabilityBar
                        className="mt-1.5"
                        label="Durability"
                        statusText={`${pmc.equippedHelmet.durability}/${pmc.equippedHelmet.maxDurability}`}
                        current={pmc.equippedHelmet.durability}
                        max={pmc.equippedHelmet.maxDurability}
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-meta text-fg-faint font-mono italic">No helmet equipped</span>
                )}
              </div>
            </div>
          </Card>

          {/* WEAPONS VAULT STORAGE CARD — natural height at the tail of the sidebar */}
          <Card id="stash-weapons-card" className="flex flex-col justify-between shrink-0">
            <div className="flex flex-col">
              <PanelHeader title="Weapons Vault" />

              <ScrollPane className="space-y-3">
                {(stash.weapons || []).map((gun) => {
                  const isEquipped = stash.equippedWeaponId === gun.id;

                  return (
                    <div
                      key={gun.id}
                      className={`p-3 rounded-control border transition ${
                        isEquipped ? "bg-panel-2 border-accent" : "bg-panel-2 border-border hover:border-border-soft"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="text-strong font-bold text-fg">{gun.name}</span>
                        {isEquipped && <Badge tone="accent">Equipped</Badge>}
                      </div>

                      <div className="text-meta text-fg-low font-mono mb-3">
                        Caliber: <span className="text-fg">{gun.caliber}</span>
                        <span className="mx-1.5">|</span>
                        Class: <span className="text-fg">{gun.signatureClass} Signature</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-meta text-fg-faint font-mono italic">
                          Active attachments: {Object.values(gun.mods).filter(Boolean).length} slotted
                        </span>

                        {!isEquipped && (
                          <Button id={`equip-gun-${gun.id}`} onClick={() => onEquipWeapon(gun.id)}>
                            Equip Gun
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </ScrollPane>
            </div>

            <div className="mt-4 pt-3 border-t border-border/80 shrink-0">
              <span className="text-meta text-fg-low font-mono italic block text-center">
                Use the dedicated Mod Bench tab to configure muzzle parts, sights, foregrips, stocks, or magazines on your firearms.
              </span>
            </div>
          </Card>

        </div>
      </div>

    </div>
  );
};
