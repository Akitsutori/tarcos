/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { GameState, ClassType, HideoutModule, Skill } from "../types";
import { ALL_ITEMS } from "../data/content/items";
import { 
  Home, Sparkles, TrendingUp, ShieldAlert, Award, 
  ChevronUp, Lock, CheckCircle2, ChevronRight, RefreshCw 
} from "lucide-react";

interface ProgressionScreenProps {
  gameState: GameState;
  onUpgradeModule: (moduleId: string) => void;
  onChangeClass: (classType: ClassType) => void;
}

export const ProgressionScreen: React.FC<ProgressionScreenProps> = ({
  gameState,
  onUpgradeModule,
  onChangeClass
}) => {
  const { pmc, hideout, stash } = gameState;

  // Class specs for display
  const CLASS_PROFILES = [
    {
      type: ClassType.SOLDIER,
      weapon: "AK-74N 5.45x39 Assault Rifle",
      trait: "Tactical Efficiency",
      traitDesc: "+20% Firearm Damage & -15% Damage Received in active firefights. Starts with higher Strength.",
      hp: 440
    },
    {
      type: ClassType.SURVIVOR,
      weapon: "SKS 7.62x39 Carbine",
      trait: "Field Medic & Scavenger",
      traitDesc: "+25% Medical heal capacity, 20% slower energy/hydration drain. Starts with higher Endurance.",
      hp: 400
    },
    {
      type: ClassType.MARKSMAN,
      weapon: "SV-98 7.62x54R Bolt-Action Sniper",
      trait: "One Shot One Kill",
      traitDesc: "+25% Critical Hit Chance and +50% critical damage multiplier in raid. High baseline Recoil Control.",
      hp: 380
    },
    {
      type: ClassType.SCOUT,
      weapon: "SIG MPX 9x19 Submachine Gun",
      trait: "Swift Shadow",
      traitDesc: "+20% Evasion rate & +25% faster automated extraction pace. Starts with extreme search attention.",
      hp: 390
    },
    {
      type: ClassType.LUCKY,
      weapon: "Saiga-9 9x19 Carbine",
      trait: "RNG Blessings",
      traitDesc: "+25% chance of rolling rare/legendary items, 15% chance to dodge lethal hits at 1 HP. High baseline Luck.",
      hp: 410
    }
  ];

  // Helper to check if stash has required items and roubles
  const canUpgrade = (module: HideoutModule): { possible: boolean; missingItems: string[] } => {
    if (module.level >= module.maxLevel) return { possible: false, missingItems: [] };
    const nextLvlData = module.upgrades[module.level + 1];
    if (!nextLvlData) return { possible: false, missingItems: [] };

    const missingItems: string[] = [];
    
    // Check Roubles
    if (stash.roubles < nextLvlData.cost) {
      missingItems.push(`₽${(nextLvlData.cost - stash.roubles).toLocaleString()} roubles`);
    }

    // Check Barter Items
    nextLvlData.requirements.forEach((req) => {
      const stashEntry = stash.items.find(i => i.item.id === req.itemId);
      const ownedQty = stashEntry ? stashEntry.quantity : 0;
      if (ownedQty < req.quantity) {
        const itemSpec = stashEntry?.item || ALL_ITEMS[req.itemId];
        missingItems.push(`${req.quantity - ownedQty}x ${itemSpec?.name || req.itemId}`);
      }
    });

    return {
      possible: missingItems.length === 0,
      missingItems
    };
  };

  return (
    <div id="progression-screen" className="space-y-6">
      
      {/* 3-WAY BENTO ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHARACTER STATS & CLASS CHANGER */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Award className="text-amber-500" size={18} /> PMC Operator Profile
            </h3>

            {/* PMC SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Raids Executed</span>
                <span className="text-lg font-black text-slate-200 font-mono">{pmc.raidsCount}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Survival Rate</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{pmc.survivalRate}%</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Neutralizations</span>
                <span className="text-lg font-black text-red-400 font-mono">{pmc.killsCount}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase tracking-wider">KIA Incidents</span>
                <span className="text-lg font-black text-slate-400 font-mono">{pmc.kiaCount}</span>
              </div>
            </div>

            {/* CLASS SELECTOR EXPANSION */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Change Active PMC Specialty</span>
              
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {CLASS_PROFILES.map((profile) => {
                  const isActive = pmc.classType === profile.type;
                  
                  return (
                    <button
                      id={`class-select-${profile.type}`}
                      key={profile.type}
                      onClick={() => !isActive && onChangeClass(profile.type)}
                      className={`w-full p-2.5 rounded-lg border text-left transition flex justify-between items-center ${
                        isActive 
                          ? "bg-slate-950 border-amber-500" 
                          : "bg-slate-950/40 border-slate-900/60 hover:border-slate-800 hover:bg-slate-950"
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-200">{profile.type}</span>
                          {isActive && (
                            <span className="text-[8px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-mono font-bold uppercase">Active</span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5 leading-tight">{profile.trait}: {profile.traitDesc}</span>
                      </div>

                      {!isActive && (
                        <span className="text-[9px] font-mono text-slate-500 group-hover:text-amber-400 flex items-center">
                          SELECT <ChevronRight size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 text-[10px] text-slate-500 font-mono text-center">
            *Swapping classes inherits the new signature weapon and loads specialized character parameters.
          </div>
        </div>

        {/* CHARACTER SKILLS BLOCK */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={18} /> RPG Character Skills
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Skills train dynamically in raids (e.g. survival actions train Constitution, firing weapons trains Weapon Mastery). Leveling up offers permanent bonuses.
            </p>

            <div className="space-y-4">
              {Object.values(pmc.skills).map((skill: Skill) => {
                const percent = (skill.xp / skill.maxXp) * 100;
                
                // Calculate training multiplier based on GDD class weights
                let multiplierStr = "x1.0";
                let isBonus = false;
                if (pmc.classType === ClassType.SOLDIER) {
                  if (skill.id === "weaponSkill") { multiplierStr = "x1.5"; isBonus = true; }
                  else if (skill.id === "constitution") { multiplierStr = "x1.2"; isBonus = true; }
                  else if (skill.id === "initiative") multiplierStr = "x1.0";
                  else multiplierStr = "x0.8";
                } else if (pmc.classType === ClassType.SURVIVOR) {
                  if (skill.id === "constitution") { multiplierStr = "x1.5"; isBonus = true; }
                  else if (skill.id === "perception") { multiplierStr = "x1.2"; isBonus = true; }
                  else if (skill.id === "agility") multiplierStr = "x1.0";
                  else multiplierStr = "x0.8";
                } else if (pmc.classType === ClassType.MARKSMAN) {
                  if (skill.id === "perception") { multiplierStr = "x1.5"; isBonus = true; }
                  else if (skill.id === "initiative") { multiplierStr = "x1.2"; isBonus = true; }
                  else if (skill.id === "weaponSkill") multiplierStr = "x1.0";
                  else multiplierStr = "x0.8";
                } else if (pmc.classType === ClassType.SCOUT) {
                  if (skill.id === "agility") { multiplierStr = "x1.5"; isBonus = true; }
                  else if (skill.id === "initiative") { multiplierStr = "x1.2"; isBonus = true; }
                  else if (skill.id === "perception") multiplierStr = "x1.0";
                  else multiplierStr = "x0.8";
                } else if (pmc.classType === ClassType.LUCKY) {
                  if (skill.id === "initiative") { multiplierStr = "x1.5"; isBonus = true; }
                  else if (skill.id === "perception") { multiplierStr = "x1.2"; isBonus = true; }
                  else if (skill.id === "agility") multiplierStr = "x1.0";
                  else multiplierStr = "x0.8";
                }

                return (
                  <div key={skill.id} className="p-3 bg-slate-950 rounded border border-slate-850/80">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <span className="text-xs font-bold text-slate-200">{skill.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono ml-2">Level {skill.level}</span>
                        <span className={`ml-2 text-[8px] px-1 py-0.2 rounded font-mono font-bold uppercase ${
                          isBonus ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-slate-900 text-slate-500 border border-slate-800"
                        }`}>
                          Training Rate: {multiplierStr}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold">{skill.bonusPerLevel}</span>
                    </div>

                    <div className="h-1.5 bg-slate-900 rounded overflow-hidden relative">
                      <div className="h-full bg-emerald-500 rounded transition-all duration-300" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-1">
                      <span>{skill.description}</span>
                      <span>{skill.xp} / {skill.maxXp} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 text-[10px] text-slate-500 font-mono text-center">
            Max Skill Level: Elite (unlocked via incremental passive training in successful extractions).
          </div>
        </div>
      </div>

      {/* HIDEOUT UPGRADES MODULE GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-md font-bold text-white font-mono uppercase tracking-wide border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
          <Home className="text-slate-400" size={18} /> Hideout Shelters & Stations
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Reconstruct tactical hideout modules using Roubles and specialized barter equipment scavenged in raids to unlock global bonuses and weapon statistics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.values(hideout).map((module: HideoutModule) => {
            const isMax = module.level >= module.maxLevel;
            const nextLvl = module.level + 1;
            const upgradeData = module.upgrades[nextLvl];
            const upgCheck = canUpgrade(module);

            return (
              <div 
                key={module.id}
                className="p-4 bg-slate-950 border border-slate-850/80 rounded-lg flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{module.name}</h4>
                      <span className="text-[9px] text-slate-500 font-mono">Current Tier: {module.level} / {module.maxLevel}</span>
                    </div>
                    {isMax ? (
                      <span className="p-1 bg-emerald-950/40 border border-emerald-900/60 rounded text-emerald-400 text-[9px] font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} /> MAX LEVEL
                      </span>
                    ) : (
                      <span className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[9px] font-mono">
                        Tier {nextLvl} Upgradeable
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 italic mb-3">
                    {module.description}
                  </p>

                  {/* ACTIVE BONUS */}
                  {module.level > 0 && (
                    <div className="mb-3 p-1.5 bg-emerald-950/10 border border-emerald-900/10 rounded">
                      <span className="text-[8px] text-emerald-500 font-mono font-bold uppercase block">Active Station Bonus</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{module.upgrades[module.level].bonus}</span>
                    </div>
                  )}

                  {/* NEXT LEVEL REQUIREMENTS */}
                  {!isMax && upgradeData && (
                    <div className="space-y-1.5 p-2 bg-slate-900/50 rounded border border-slate-900">
                      <span className="text-[8px] text-slate-500 font-mono font-bold uppercase block">Upgrade Reqs</span>
                      <div className="text-[9px] font-mono text-amber-500 font-bold">
                        Cost: ₽{upgradeData.cost.toLocaleString()}
                      </div>
                      <div className="space-y-0.5">
                        {upgradeData.requirements.map((req, i) => {
                          const itemSpec = ALL_ITEMS[req.itemId];
                          const stashEntry = stash.items.find(st => st.item.id === req.itemId);
                          const owned = stashEntry ? stashEntry.quantity : 0;
                          
                          return (
                            <div key={i} className="flex justify-between text-[9px] font-mono">
                              <span className="text-slate-500">{itemSpec?.name || req.itemId}</span>
                              <span className={owned >= req.quantity ? "text-slate-300 font-bold" : "text-red-500"}>
                                {owned} / {req.quantity}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {!isMax && upgradeData && (
                  <button
                    id={`upgrade-hideout-${module.id}`}
                    onClick={() => onUpgradeModule(module.id)}
                    disabled={!upgCheck.possible}
                    className={`w-full mt-4 py-1.5 rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      upgCheck.possible
                        ? "bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400"
                        : "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
                    }`}
                    title={!upgCheck.possible ? `Missing: ${upgCheck.missingItems.join(", ")}` : "Upgrade module"}
                  >
                    <ChevronUp size={13} />
                    CONSTRUCT UPGRADE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
