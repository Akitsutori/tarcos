/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GameState, Weapon, WeaponModCategory, GameItem } from "../types";
import { getWeaponStats } from "../data/construction";
import { Eye, ShieldAlert, Crosshair, Disc, Crown, LayoutTemplate, PlusCircle, Trash2 } from "lucide-react";

interface WeaponModdingProps {
  gameState: GameState;
  onEquipMod: (weaponId: string, category: WeaponModCategory, modItem: GameItem) => void;
  onUnequipMod: (weaponId: string, category: WeaponModCategory) => void;
}

export const WeaponModding: React.FC<WeaponModdingProps> = ({
  gameState,
  onEquipMod,
  onUnequipMod
}) => {
  const { stash, hideout } = gameState;
  const activeWeapon = stash.weapons ? (stash.weapons.find(w => w.id === stash.equippedWeaponId) || stash.weapons[0]) : undefined;
  const [selectedCategory, setSelectedCategory] = useState<WeaponModCategory | null>(null);

  // Compute stats of currently selected weapon
  const currentStats = getWeaponStats(activeWeapon, hideout.workbench.level);
  // Compute base stats of the weapon (without mods)
  const baseStats = getWeaponStats(activeWeapon ? { ...activeWeapon, mods: activeWeapon.mods || {} } : undefined, hideout.workbench.level);

  // Get list of compatible mods of a certain category in the stash
  const getCompatibleModsInStash = (category: WeaponModCategory): { item: GameItem; quantity: number }[] => {
    return stash.items ? stash.items.filter(({ item, quantity }) => {
      return item && item.type === "weapon_mod" && item.modCategory === category && quantity > 0;
    }) : [];
  };

  // Icon mapping for each mod slot
  const getCategoryIcon = (category: WeaponModCategory) => {
    switch (category) {
      case WeaponModCategory.SIGHT:
        return <Eye size={16} className="text-cyan-400" />;
      case WeaponModCategory.SUPPRESSOR:
        return <ShieldAlert size={16} className="text-red-400" />;
      case WeaponModCategory.GRIP:
        return <Crosshair size={16} className="text-emerald-400" />;
      case WeaponModCategory.MAGAZINE:
        return <Disc size={16} className="text-amber-400" />;
      case WeaponModCategory.STOCK:
        return <Crown size={16} className="text-purple-400" />;
      case WeaponModCategory.HANDGUARD:
        return <LayoutTemplate size={16} className="text-slate-400" />;
    }
  };

  const modCategoriesList = Object.values(WeaponModCategory);

  if (!activeWeapon) {
    return (
      <div id="weapon-modding-bench-empty" className="bg-slate-900 border border-slate-800 rounded-lg p-10 text-center text-slate-400 font-mono">
        <LayoutTemplate className="mx-auto text-amber-500 mb-4" size={36} />
        <h3 className="text-md font-bold text-white mb-2">No Active Weapon Equipped</h3>
        <p className="text-xs text-slate-500">Equip a primary firearm from the Stash & Market tab to customize its tactical attachments.</p>
      </div>
    );
  }

  return (
    <div id="weapon-modding-bench" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: ACTIVE WEAPON GENERAL SPEC & COMPARATIVE BARS */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-800 pb-3 mb-4">
            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Workbench Workspace</span>
            <h3 className="text-lg font-bold text-white font-mono">Weapon Customization</h3>
            <span className="text-xs font-semibold font-mono text-amber-500">{activeWeapon.name}</span>
          </div>

          <div className="space-y-5">
            {/* ERGONOMICS */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Ergonomics (ADS/Evasion)</span>
                <span className="text-slate-200 font-bold">
                  {currentStats.ergo} / 100 
                  {currentStats.ergo > baseStats.ergo && (
                    <span className="text-emerald-400 ml-1.5">(+{currentStats.ergo - baseStats.ergo})</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${currentStats.ergo}%` }} />
              </div>
            </div>

            {/* RECOIL */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Vertical Recoil (Dispersion)</span>
                <span className="text-slate-200 font-bold">
                  {currentStats.recoil} pts
                  {currentStats.recoil < baseStats.recoil && (
                    <span className="text-emerald-400 ml-1.5">(-{baseStats.recoil - currentStats.recoil} pts)</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden">
                {/* Lower is better, let's reverse the fill representation: 140 base minus current over max */}
                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(10, (140 - currentStats.recoil) / 1.4))}%` }} />
              </div>
            </div>

            {/* ACCURACY */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Weapon Accuracy Rating</span>
                <span className="text-slate-200 font-bold">
                  {currentStats.accuracy}%
                  {currentStats.accuracy > baseStats.accuracy && (
                    <span className="text-emerald-400 ml-1.5">(+{currentStats.accuracy - baseStats.accuracy}%)</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${currentStats.accuracy}%` }} />
              </div>
            </div>

            {/* CALIBER & DAMAGE */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs font-mono border-t border-slate-800/80">
              <div>
                <span className="text-slate-500">Muzzle Caliber</span>
                <div className="text-slate-200 font-bold mt-0.5">{activeWeapon.caliber}</div>
              </div>
              <div>
                <span className="text-slate-500">Bullet Dmg Modifier</span>
                <div className="text-slate-200 font-bold mt-0.5">
                  {currentStats.dmg} HP 
                  {currentStats.dmg > baseStats.dmg && (
                    <span className="text-emerald-400 ml-1">+{currentStats.dmg - baseStats.dmg}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 leading-relaxed text-center">
          *Higher ergonomics boosts PMC evasion rate and accuracy bonuses. Lower recoil boosts full-auto bullet grouping stability in active firefights.
        </div>
      </div>

      {/* CENTER COLUMN: INTERACTIVE MODDING SLOTS */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-5 flex items-center gap-2">
          Weapon Mod Slots
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {modCategoriesList.map((category) => {
            const equippedMod = activeWeapon.mods[category];
            const isSelected = selectedCategory === category;
            
            return (
              <div 
                key={category}
                className={`p-3 rounded-lg border transition flex items-center justify-between gap-4 ${
                  isSelected 
                    ? "bg-slate-950 border-amber-500" 
                    : equippedMod 
                      ? "bg-slate-950/80 border-slate-800 hover:border-slate-700" 
                      : "bg-slate-950/40 border-slate-900/60 hover:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    {getCategoryIcon(category)}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-wide">{category}</span>
                    <span className={`text-xs font-bold font-mono ${equippedMod ? "text-slate-200" : "text-slate-600 italic"}`}>
                      {equippedMod ? equippedMod.name : "Unslotted / Empty"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {equippedMod && (
                    <button
                      id={`unequip-${category.replace("/", "-")}-btn`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnequipMod(activeWeapon.id, category);
                      }}
                      className="p-1.5 bg-red-950/40 hover:bg-red-950 text-red-400 rounded transition border border-red-900/40"
                      title="Unequip attachment"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    id={`select-cat-${category.replace("/", "-")}-btn`}
                    onClick={() => setSelectedCategory(isSelected ? null : category)}
                    className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition border ${
                      isSelected 
                        ? "bg-amber-500 text-slate-950 border-amber-500" 
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {isSelected ? "CLOSE" : equippedMod ? "CHANGE" : "ATTACH"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* COMPATIBLE MOD LIST DRAWER FOR SELECTED SLOT */}
        {selectedCategory && (
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
            <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <PlusCircle size={14} className="text-amber-500" /> Compatible Stock Attachments ({selectedCategory})
            </h4>

            {getCompatibleModsInStash(selectedCategory).length === 0 ? (
              <div className="text-center py-5 text-slate-500 font-mono text-xs italic bg-slate-950/40 border border-dashed border-slate-900 rounded">
                No compatible mods in your Stash. Buy attachments from Mechanic's Workshop trader.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {getCompatibleModsInStash(selectedCategory).map(({ item, quantity }) => (
                  <div 
                    key={item.id}
                    className="p-3 bg-slate-900 rounded border border-slate-850 flex justify-between items-center hover:border-slate-700 transition"
                  >
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-200 block">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono leading-tight block mt-0.5 line-clamp-1">{item.description}</span>
                    </div>

                    <button
                      id={`mod-slot-attach-${item.id}`}
                      onClick={() => {
                        onEquipMod(activeWeapon.id, selectedCategory, item);
                        setSelectedCategory(null);
                      }}
                      className="ml-3 px-2.5 py-1 bg-amber-500 text-slate-950 hover:bg-amber-400 font-mono text-[10px] font-bold rounded transition"
                    >
                      SLOT PART
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
