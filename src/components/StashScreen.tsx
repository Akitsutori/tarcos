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
import { 
  Coins, PackageOpen, Heart, Zap, 
  Droplet, Package
} from "lucide-react";

interface StashScreenProps {
  gameState: GameState;
  onSellItem: (itemId: string, quantity: number) => void;
  onBuyItem: (itemId: string, cost: number) => void;
  onConsumeItem: (itemId: string) => void;
  onEquipWeapon: (weaponId: string) => void;
  onEquipArmor: (itemId: string) => void;
}

export const StashScreen: React.FC<StashScreenProps> = ({
  gameState,
  onSellItem,
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

  // Unified item list: owned items + buyable items from traders
  // Medical/provision items: single entry per type, quantity = backup kits
  const allVisibleItems = useMemo(() => {
    const ownedMap = new Map<string, number>();
    const resourceMap = new Map<string, { lowest: number; max: number }>();
    for (const entry of stash.items) {
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

    const result: {
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
        result.push({
          item,
          owned: ownedMap.get(item.id) ?? 0,
          buyable: true,
          resourceLowest: res?.lowest,
          resourceMax: res?.max,
        });
      }
    }

    // Owned items that are NOT buyable
    for (const entry of stash.items) {
      if (entry.quantity > 0 && !(entry.item.soldBy && entry.item.traderCost)) {
        const existing = result.find(r => r.item.id === entry.item.id);
        if (!existing) {
          const res = resourceMap.get(entry.item.id);
          result.push({
            item: entry.item,
            owned: entry.quantity,
            buyable: false,
            resourceLowest: res?.lowest,
            resourceMax: res?.max,
          });
        }
      }
    }

    return result;
  }, [stash.items]);

  // Filter by category
  const filteredItems = allVisibleItems.filter(({ item }) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "armor") return item.type === "armor" || item.type === "helmet";
    return item.type === activeCategory;
  });

  // Compute total stash value
  const totalStashValue = stash.items.reduce((acc, entry) => acc + (entry.item.value * entry.quantity), 0) + stash.roubles;

  // Helper for item rarity styling
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

  return (
    <div id="stash-screen" className="space-y-6">
      
      {/* PERSISTENT HEADER CARD WITH STATS */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-amber-500">
            <Coins size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-mono uppercase tracking-widest font-bold">Liquid Reserves</div>
            <div className="text-2xl font-black text-amber-500 font-mono">
              ₽{stash.roubles.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Total Net Worth (Stash value): <span className="text-slate-200">₽{totalStashValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: 2/3 INVENTORY + 1/3 SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STASH ITEMS SECTION */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col min-h-[400px]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
              <PackageOpen size={16} className="text-amber-500" />
              Inventory & Market
            </h3>
            
            {/* CATEGORY SELECTOR */}
            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded border border-slate-800/80">
              {(["all", "barter", "medical", "provision", "weapon_mod", "armor"] as const).map((cat) => (
                <button
                  id={`stash-cat-${cat}-btn`}
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded capitalize transition ${
                    activeCategory === cat 
                      ? "bg-slate-800 text-amber-400" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {cat === "all" ? "All" : cat.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
              <PackageOpen size={40} className="text-slate-700 mb-3" />
              <span className="text-sm font-mono italic">No items to display.</span>
              <span className="text-xs text-slate-600 font-mono mt-1">Deploy on raids to scavenge supplies or buy from market.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[600px] pr-1">
              {filteredItems.map(({ item, owned, buyable, resourceLowest, resourceMax }) => {
                const isConsumable = item.type === "medical" || item.type === "provision";
                const isMedkit = item.medicalSubType === "medkit";
                const isSurgicalKit = item.medicalSubType === "surgical";
                const hasResource = isMedkit || isSurgicalKit || item.type === "provision";
                const isArmor = item.type === "armor" || item.type === "helmet";
                const isAffordable = buyable && stash.roubles >= (item.traderCost ?? 0);
                const isOwned = owned > 0;
                const isEquippedArmor = isArmor && isOwned && (item.id === pmc.equippedArmor?.id || item.id === pmc.equippedHelmet?.id);
                const hasDurability = isArmor && item.durability !== undefined && item.maxDurability !== undefined && item.maxDurability > 0;
                const durabilityPercent = hasDurability ? ((item.durability ?? 0) / (item.maxDurability ?? 1)) * 100 : null;
                const resourcePercent = hasResource && resourceMax && resourceMax > 0 && resourceLowest !== undefined
                  ? (resourceLowest / resourceMax) * 100
                  : null;
                
                return (
                  <div 
                    key={item.id}
                    className={`p-3 border rounded-lg flex flex-col justify-between transition ${
                      isOwned 
                        ? "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                        : "bg-slate-950/60 border-slate-800/40 hover:border-slate-700/60"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-xs font-bold line-clamp-1 ${isOwned ? "text-slate-200" : "text-slate-400"}`}>
                          {item.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase border ${getRarityBadgeStyle(item.rarity)}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 min-h-[30px]">
                        {item.description}
                      </p>
                    </div>

                    {/* Resource bar for medical/provision items */}
                    {isOwned && hasResource && resourcePercent !== null && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-[9px] font-mono mb-0.5">
                          <span className="text-slate-500">{isSurgicalKit ? "Uses" : item.provisionType === "hydration" ? "Hydration" : item.provisionType === "energy" ? "Energy" : "Capacity"}</span>
                          <span className={`font-bold ${
                            resourcePercent >= 60 ? "text-emerald-400" : resourcePercent >= 25 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {resourceLowest}/{resourceMax}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden border border-slate-800/50">
                          <div 
                            className={`h-full rounded transition-all duration-300 ${
                              resourcePercent >= 60 ? "bg-emerald-500" : resourcePercent >= 25 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, resourcePercent))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Durability bar for armor/helmet items */}
                    {isOwned && hasDurability && durabilityPercent !== null && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-[9px] font-mono mb-0.5">
                          <span className="text-slate-500">Durability {item.armorClass ? `(Class ${item.armorClass})` : ""}</span>
                          <span className={`font-bold ${
                            durabilityPercent >= 60 ? "text-emerald-400" : durabilityPercent >= 25 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {item.durability}/{item.maxDurability}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden border border-slate-800/50">
                          <div 
                            className={`h-full rounded transition-all duration-300 ${
                              durabilityPercent >= 60 ? "bg-emerald-500" : durabilityPercent >= 25 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, durabilityPercent))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-900 mt-3 pt-2.5 flex items-center justify-between">
                      <div className="font-mono text-[10px]">
                        {isOwned ? (
                          <>
                            <span className="text-slate-500">Qty:</span> <span className="text-slate-200 font-bold">{owned}</span>
                            <span className="text-slate-600 mx-1.5">|</span>
                            <span className="text-slate-500">Sell:</span> <span className="text-amber-500 font-bold">₽{item.value}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-500">Not owned</span>
                            {buyable && (
                              <>
                                <span className="text-slate-600 mx-1.5">|</span>
                                <span className="text-slate-500">Buy:</span> <span className="text-amber-500 font-bold">₽{(item.traderCost ?? 0).toLocaleString()}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {/* BUY button — show when buyable */}
                        {buyable && (
                          <button
                            id={`buy-btn-${item.id}`}
                            onClick={() => onBuyItem(item.id, item.traderCost ?? 0)}
                            disabled={!isAffordable}
                            className={`px-2 py-1 rounded text-[9px] font-mono transition ${
                              isAffordable 
                                ? "bg-amber-500 text-slate-950 hover:bg-amber-400" 
                                : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
                            }`}
                          >
                            BUY
                          </button>
                        )}

                        {/* USE button — show when owned and consumable with remaining resource */}
                        {isOwned && isConsumable && !(hasResource && resourceLowest !== undefined && resourceLowest <= 0) && (
                          <button
                            id={`consume-btn-${item.id}`}
                            onClick={() => onConsumeItem(item.id)}
                            className="px-2 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded text-[9px] font-mono hover:bg-emerald-950/60 transition"
                            title={isSurgicalKit ? "Fix one blacked-out limb" : isMedkit ? "Heal all damaged body parts" : "Consume to restore hydration/energy"}
                          >
                            USE
                          </button>
                        )}

                        {/* EQUIP button — show when owned and armor/helmet and not currently equipped */}
                        {isOwned && isArmor && !isEquippedArmor && (
                          <button
                            id={`equip-armor-btn-${item.id}`}
                            onClick={() => onEquipArmor(item.id)}
                            className="px-2 py-1 bg-cyan-950/40 text-cyan-400 border border-cyan-900/40 rounded text-[9px] font-mono hover:bg-cyan-950/60 transition"
                          >
                            EQUIP
                          </button>
                        )}

                        {/* EQUIPPED badge — show when owned and currently equipped */}
                        {isOwned && isArmor && isEquippedArmor && (
                          <span className="px-2 py-1 bg-cyan-500 text-slate-950 rounded text-[9px] font-mono font-bold">
                            Equipped
                          </span>
                        )}

                        {/* SELL buttons — show when owned */}
                        {isOwned && (
                          <>
                            <button
                              id={`sell-btn-${item.id}`}
                              onClick={() => onSellItem(item.id, 1)}
                              className="px-2 py-1 bg-slate-900 text-amber-500 border border-amber-900/40 rounded text-[9px] font-mono hover:bg-amber-500 hover:text-slate-950 transition"
                            >
                              SELL 1
                            </button>
                            {owned > 1 && (
                              <button
                                id={`sell-all-btn-${item.id}`}
                                onClick={() => onSellItem(item.id, owned)}
                                className="px-2 py-1 bg-amber-950/20 text-amber-400 border border-amber-900/30 rounded text-[9px] font-mono hover:bg-amber-500 hover:text-slate-950 transition font-bold"
                              >
                                ALL
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR WITH REAL-TIME VITALS MONITOR & WEAPONS VAULT */}
        <div className="space-y-6 flex flex-col">
          
          {/* PMC REAL-TIME VITAL MONITOR CARD */}
          <div id="stash-vitals-card" className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Heart size={16} className="text-emerald-500 fill-emerald-500 animate-pulse" />
              PMC Vitals Monitor
            </h3>

            {/* OVERALL HEALTH INTEGRITY */}
            <div className="mb-4">
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="text-slate-400 font-bold">Overall Integrity</span>
                <span className={`font-bold ${totalCurrentHP === totalMaxHP ? "text-emerald-400" : "text-amber-400"}`}>
                  {totalCurrentHP} / {totalMaxHP} HP
                </span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full p-[2px] border border-slate-800/80 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    hpPercent >= 85 ? "bg-emerald-500" : hpPercent >= 45 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
                />
              </div>
            </div>

            {/* 7-ZONE LIMBS HP MATRIX */}
            <div className="border-t border-slate-800/60 pt-3 mb-4">
              <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-2.5">7-Zone Body Integrity Matrix</span>
              {pmc.bodyParts && <BodyMap bodyParts={pmc.bodyParts} />}
            </div>

            {/* ENERGY & HYDRATION STATUS */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3">
              {/* ENERGY */}
              <div className="p-2 bg-slate-950 rounded border border-slate-850/80">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap size={11} className="text-amber-500 fill-amber-500" />
                    Energy
                  </span>
                  <span className="text-amber-400 font-bold">{pmc.energy}%</span>
                </div>
                <div className="h-1 bg-slate-900 rounded overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-300" 
                    style={{ width: `${Math.min(100, Math.max(0, pmc.energy))}%` }} 
                  />
                </div>
              </div>

              {/* HYDRATION */}
              <div className="p-2 bg-slate-950 rounded border border-slate-850/80">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Droplet size={11} className="text-cyan-500 fill-cyan-500" />
                    Hydration
                  </span>
                  <span className="text-cyan-400 font-bold">{pmc.hydration}%</span>
                </div>
                <div className="h-1 bg-slate-900 rounded overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300" 
                    style={{ width: `${Math.min(100, Math.max(0, pmc.hydration))}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* PASSIVE RECOVERY BADGE */}
            {totalCurrentHP < totalMaxHP && (
              <div className="mt-3 p-1.5 bg-emerald-950/20 border border-emerald-900/30 rounded text-[9px] font-mono text-emerald-400 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Passive recovery active (+{MEDSTATION_HEAL_PER_5S_BY_LEVEL[hideout.medstation?.level ?? 0]} HP/5s)</span>
              </div>
            )}
          </div>

          {/* WEAPONS VAULT STORAGE CARD */}
          <div id="stash-weapons-card" className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-4">
                Weapons Vault
              </h3>

              <div className="space-y-4">
                {(stash.weapons || []).map((gun) => {
                  const isEquipped = stash.equippedWeaponId === gun.id;
                  
                  return (
                    <div 
                      key={gun.id}
                      className={`p-3.5 rounded-lg border transition ${
                        isEquipped 
                          ? "bg-slate-950 border-amber-500" 
                          : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {gun.name}
                        </span>
                        {isEquipped && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-amber-500 text-slate-950">
                            Equipped
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-slate-500 font-mono mb-3">
                        Caliber: <span className="text-slate-300">{gun.caliber}</span> 
                        <span className="mx-1.5">|</span>
                        Class: <span className="text-slate-300">{gun.signatureClass} Signature</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-600 font-mono italic">
                          Active attachments: {Object.values(gun.mods).filter(Boolean).length} slotted
                        </span>

                        {!isEquipped && (
                          <button
                            id={`equip-gun-${gun.id}`}
                            onClick={() => onEquipWeapon(gun.id)}
                            className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-600 text-xs font-mono transition"
                          >
                            Equip Gun
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-500 font-mono italic block text-center">
                Use the dedicated **Mod Bench** tab to configure muzzle parts, sights, foregrips, stocks, or magazines on your firearms.
              </span>
            </div>
          </div>

          {/* EQUIPPED ARMOR CARD */}
          <div id="stash-armor-card" className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-4">
              Equipped Armor
            </h3>

            <div className="space-y-3">
              {/* Body Armor */}
              <div className={`p-3 rounded-lg border ${pmc.equippedArmor ? "bg-slate-950 border-cyan-500" : "bg-slate-950/60 border-slate-800/60"}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Body Armor</span>
                  {pmc.equippedArmor && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-cyan-500 text-slate-950">
                      Equipped
                    </span>
                  )}
                </div>
                {pmc.equippedArmor ? (
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{pmc.equippedArmor.name}</span>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Class <span className="text-slate-300">{pmc.equippedArmor.armorClass}</span>
                      <span className="mx-1.5">|</span>
                      Zones: <span className="text-slate-300">{pmc.equippedArmor.protectedZones?.join(", ") || "—"}</span>
                    </div>
                    {pmc.equippedArmor.durability !== undefined && pmc.equippedArmor.maxDurability !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-[9px] font-mono mb-0.5">
                          <span className="text-slate-500">Durability</span>
                          <span className={`font-bold ${
                            (pmc.equippedArmor.durability / pmc.equippedArmor.maxDurability) >= 0.6 ? "text-emerald-400" :
                            (pmc.equippedArmor.durability / pmc.equippedArmor.maxDurability) >= 0.25 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {pmc.equippedArmor.durability}/{pmc.equippedArmor.maxDurability}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden border border-slate-800/50">
                          <div 
                            className={`h-full rounded transition-all duration-300 ${
                              (pmc.equippedArmor.durability / pmc.equippedArmor.maxDurability) >= 0.6 ? "bg-emerald-500" :
                              (pmc.equippedArmor.durability / pmc.equippedArmor.maxDurability) >= 0.25 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, (pmc.equippedArmor.durability / pmc.equippedArmor.maxDurability) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-600 font-mono italic">No body armor equipped</span>
                )}
              </div>

              {/* Helmet */}
              <div className={`p-3 rounded-lg border ${pmc.equippedHelmet ? "bg-slate-950 border-cyan-500" : "bg-slate-950/60 border-slate-800/60"}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Helmet</span>
                  {pmc.equippedHelmet && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-cyan-500 text-slate-950">
                      Equipped
                    </span>
                  )}
                </div>
                {pmc.equippedHelmet ? (
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{pmc.equippedHelmet.name}</span>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Class <span className="text-slate-300">{pmc.equippedHelmet.armorClass}</span>
                      <span className="mx-1.5">|</span>
                      Zones: <span className="text-slate-300">{pmc.equippedHelmet.protectedZones?.join(", ") || "—"}</span>
                    </div>
                    {pmc.equippedHelmet.durability !== undefined && pmc.equippedHelmet.maxDurability !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-[9px] font-mono mb-0.5">
                          <span className="text-slate-500">Durability</span>
                          <span className={`font-bold ${
                            (pmc.equippedHelmet.durability / pmc.equippedHelmet.maxDurability) >= 0.6 ? "text-emerald-400" :
                            (pmc.equippedHelmet.durability / pmc.equippedHelmet.maxDurability) >= 0.25 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {pmc.equippedHelmet.durability}/{pmc.equippedHelmet.maxDurability}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden border border-slate-800/50">
                          <div 
                            className={`h-full rounded transition-all duration-300 ${
                              (pmc.equippedHelmet.durability / pmc.equippedHelmet.maxDurability) >= 0.6 ? "bg-emerald-500" :
                              (pmc.equippedHelmet.durability / pmc.equippedHelmet.maxDurability) >= 0.25 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, (pmc.equippedHelmet.durability / pmc.equippedHelmet.maxDurability) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-600 font-mono italic">No helmet equipped</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
