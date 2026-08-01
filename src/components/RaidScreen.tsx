/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { GameState, RaidLog, ClassType, PMCBodyParts, BodyPart } from "../types";
import { getWeaponStats } from "../data/construction";
import { ALL_MAPS } from "../data/content/maps";
import { SHOOTING_RANGE_BONUS } from "../data/tuning/hideoutConfig";
import { totalCurrentHp, totalMaxHp } from "../engine/bodyParts";
import { BodyMap } from "./BodyMap";
import { 
  Play, Pause, Heart, Zap, Droplet, Skull, 
  MapPin, ShieldAlert, Crosshair, Package, ArrowRight, ShieldCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RaidScreenProps {
  gameState: GameState;
  onTick: () => void;
  onTogglePlay: (playState: boolean) => void;
  onChangeSpeed: (speed: number) => void;
  onDeployRaid: (mapId: string) => void;
  onCancelRaid: () => void;
  isPlaying: boolean;
}

export const RaidScreen: React.FC<RaidScreenProps> = ({
  gameState,
  onTick,
  onTogglePlay,
  onChangeSpeed,
  onDeployRaid,
  onCancelRaid,
  isPlaying
}) => {
  const { activeRaid, pmc, stash, hideout } = gameState;
  const raid = activeRaid;
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal logs (only the log panel, not the page)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [activeRaid.logs.length]);

  // Simulation tick timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && activeRaid.isActive) {
      const intervalMs = Math.max(100, 1500 / activeRaid.playSpeed);
      timer = setInterval(() => {
        onTick();
      }, intervalMs);
    } else if (!activeRaid.isActive && isPlaying) {
      onTogglePlay(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, activeRaid.isActive, activeRaid.playSpeed, onTogglePlay, onTick]);

  const weaponsList = stash.weapons || [];
  const equippedWeapon = weaponsList.find(w => w.id === stash.equippedWeaponId) || weaponsList[0];
  const weaponStats = getWeaponStats(equippedWeapon, hideout.workbench.level);

  // Calculate overall health values dynamically
  const totalCurrentHP = totalCurrentHp(pmc.bodyParts);
  const totalMaxHP = totalMaxHp(pmc.bodyParts);

  // Helper for color-coding terminal log types
  const getLogStyle = (type: RaidLog["type"]) => {
    switch (type) {
      case "combat_kill":
        return "text-green-400 font-bold border-l-2 border-green-500 pl-2 bg-green-950/20 py-1";
      case "combat_hit":
        return "text-red-400 border-l-2 border-red-500 pl-2";
      case "combat_damage":
        return "text-orange-400 font-mono";
      case "combat_profile":
        return "text-purple-400 font-bold pl-2 border-l-2 border-purple-500 bg-purple-950/20 py-1 font-mono text-[11px]";
      case "combat_round":
        return "text-sky-400 font-bold pl-2 border-l-2 border-sky-500 bg-sky-950/10 py-0.5 font-mono text-[11px]";
      case "status":
        return "text-teal-400 font-mono text-[10px] pl-2 border-l border-teal-800";
      case "loot":
        return "text-cyan-400 font-medium pl-2 border-l-2 border-cyan-500 bg-cyan-950/10 py-0.5";
      case "heal":
        return "text-emerald-400";
      case "death":
        return "text-red-600 font-black bg-red-950/30 border border-red-900 rounded p-2 text-center text-sm uppercase tracking-widest my-2";
      case "extract":
        return "text-yellow-400 font-bold bg-yellow-950/20 border border-yellow-900 rounded p-2 text-center text-sm uppercase tracking-wider my-2";
      case "warning":
        return "text-amber-500 font-bold pl-2 border-l-2 border-amber-500 bg-amber-950/20";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div id="raid-screen" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: ACTIVE PMC STATUS MONITOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
            <div>
              <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Operator State</span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {pmc.classType} Class PMC
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-widest font-bold">Level {pmc.level}</span>
              <div className="text-[10px] text-slate-400 font-mono">{pmc.xp} / {pmc.maxXp} XP</div>
            </div>
          </div>

          {/* VITAL METERS */}
          <div className="space-y-4">
            {/* OVERALL HP */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Heart size={13} className="text-red-500 fill-red-500" /> VITAL SIGNS (HP)
                </span>
                <span className={`${totalCurrentHP < totalMaxHP * 0.35 ? "text-red-400 animate-pulse font-bold" : "text-emerald-400"}`}>
                  {totalCurrentHP} / {totalMaxHP}
                </span>
              </div>
              <div className="h-2 bg-slate-950 rounded overflow-hidden">
                <motion.div 
                  className={`h-full ${totalCurrentHP < totalMaxHP * 0.35 ? "bg-red-500" : "bg-emerald-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalCurrentHP / totalMaxHP) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* 7-ZONE BODY MATRIX */}
            <div className="border-t border-slate-800/80 pt-3">
              <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-2.5">7-Zone Body Integrity Matrix</span>
              <BodyMap bodyParts={pmc.bodyParts} />
            </div>

            {/* ENERGY */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap size={13} className="text-amber-500 fill-amber-500" /> ENERGY RESERVES
                </span>
                <span className="text-amber-400">{pmc.energy}%</span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded overflow-hidden">
                <motion.div 
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pmc.energy}%` }}
                />
              </div>
            </div>

            {/* HYDRATION */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Droplet size={13} className="text-cyan-400 fill-cyan-400" /> HYDRATION LEVEL
                </span>
                <span className="text-cyan-400">{pmc.hydration}%</span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded overflow-hidden">
                <motion.div 
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pmc.hydration}%` }}
                />
              </div>
            </div>
          </div>

          {/* ACTIVE WEAPON SPEC */}
          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800/80">
            <h4 className="text-xs font-mono font-semibold text-slate-400 mb-2 uppercase tracking-wide">Primary Firearm</h4>
            <div className="text-sm font-bold text-slate-200 mb-3">{equippedWeapon ? equippedWeapon.name : "Knife / Unarmed"}</div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500">Ergonomics</span>
                <div className="text-slate-300 font-bold">{weaponStats.ergo} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">Recoil Mod</span>
                <div className="text-slate-300 font-bold">{weaponStats.recoil} pts</div>
              </div>
              <div>
                <span className="text-slate-500">Bullet Dmg</span>
                <div className="text-slate-300 font-bold">{weaponStats.dmg} HP</div>
              </div>
              <div>
                <span className="text-slate-500">Eff. Accuracy</span>
                <div className="text-slate-300 font-bold">
                  {weaponStats.accuracy + pmc.skills.weaponSkill.level + SHOOTING_RANGE_BONUS[hideout.shootingRange.level]}%
                  <span className="text-[9px] text-emerald-400 font-normal ml-1">
                    (+{pmc.skills.weaponSkill.level} skill{hideout.shootingRange.level > 0 ? ` +${SHOOTING_RANGE_BONUS[hideout.shootingRange.level]} range` : ""})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DERIVED COMBAT STATS */}
          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800/80">
            <h4 className="text-xs font-mono font-semibold text-slate-400 mb-2 uppercase tracking-wide">Derived Combat Stats</h4>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500">Dodge Chance</span>
                <div className="text-slate-300 font-bold">
                  {(pmc.skills.agility.level * 0.25).toFixed(1)}%
                  {pmc.classType === ClassType.SCOUT && <span className="text-[9px] text-violet-400 font-normal ml-1">(SCOUT x2)</span>}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Initiative</span>
                <div className="text-slate-300 font-bold">d20+{pmc.skills.initiative.level}</div>
              </div>
              <div>
                <span className="text-slate-500">Bleed Resist</span>
                <div className="text-slate-300 font-bold">
                  {Math.max(5, 35 - pmc.skills.constitution.level)}%
                  <span className="text-[9px] text-slate-500 font-normal ml-1">threshold</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Loot Chance</span>
                <div className="text-slate-300 font-bold">{50 + pmc.skills.perception.level}%</div>
              </div>
              <div>
                <span className="text-slate-500">Backpack</span>
                <div className="text-slate-300 font-bold">
                  {9 + Math.floor(Math.sqrt(pmc.skills.constitution.level * 30))} slots
                </div>
              </div>
              <div>
                <span className="text-slate-500">Stamina Drain</span>
                <div className="text-slate-300 font-bold">x{Math.max(0.5, 1 - pmc.skills.constitution.level * 0.015).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* HISTORIC RECORD BAR */}
          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800/80 font-mono text-[10px]">
            <span className="text-slate-500 uppercase tracking-wider text-[8px] font-bold block mb-2">Past Raid Outcomes History (Last 10)</span>
            <div className="flex gap-1.5 h-6">
              {gameState.pastRaidOutcomes.slice(-10).map((outcome, idx) => (
                <div 
                  key={idx} 
                  className={`flex-1 rounded flex items-center justify-center text-[10px] font-black ${
                    outcome === "extracted" 
                      ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400" 
                      : "bg-red-950/40 border border-red-500/30 text-red-500"
                  }`}
                  title={outcome === "extracted" ? "SURVIVED" : "KILLED IN ACTION"}
                >
                  {outcome === "extracted" ? "S" : "M"}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 10 - gameState.pastRaidOutcomes.slice(-10).length) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="flex-1 rounded border border-dashed border-slate-800 flex items-center justify-center text-[8px] text-slate-700">
                  -
                </div>
              ))}
            </div>
          </div>

          {/* QUEST SIDEBAR TRACKER */}
          <div className="mt-4 bg-slate-950 border border-slate-800/80 rounded p-3">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide border-b border-slate-850 pb-2 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="text-amber-500" size={14} /> Active Trader Quests
            </h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {gameState.activeQuests.map((quest) => {
                const pct = (quest.progress / quest.count) * 100;
                const traderColor = quest.trader === "prapor" ? "text-amber-400" : quest.trader === "therapist" ? "text-emerald-400" : "text-purple-400";
                return (
                  <div key={quest.id} className="p-1.5 bg-slate-900 rounded border border-slate-850 font-mono text-[9px]">
                    <div className="flex justify-between items-start mb-0.5">
                      <div>
                        <span className="text-slate-200 font-bold">{quest.name}</span>
                        <span className={`ml-1.5 font-bold uppercase text-[7px] ${traderColor}`}>[{quest.trader.toUpperCase()}]</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{quest.progress} / {quest.count}</span>
                    </div>
                    <div className="h-1 bg-slate-950 rounded overflow-hidden mb-0.5">
                      <div className="h-full bg-amber-500 animate-pulse" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* CONTROLLERS OR RAID LAUNCH PANEL */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          {activeRaid.isActive ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Raid Simulation Rate</span>
                <span>{activeRaid.playSpeed}x speed</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  id="toggle-play-btn"
                  onClick={() => onTogglePlay(!isPlaying)}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 font-mono text-sm border font-semibold transition ${
                    isPlaying 
                      ? "bg-amber-950/40 text-amber-400 border-amber-900/60 hover:bg-amber-950/60" 
                      : "bg-emerald-950/40 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/60"
                  }`}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                  {isPlaying ? "PAUSE SIM" : "RESUME SIM"}
                </button>
                <button
                  id="cancel-raid-btn"
                  onClick={onCancelRaid}
                  className="px-3 py-2 rounded-md bg-red-950/40 text-red-400 border border-red-900/60 hover:bg-red-950/60 transition"
                  title="Force Emergency Disconnect (KIA)"
                >
                  <Skull size={15} />
                </button>
              </div>

              {/* SPEED ADJUSTMENT */}
              <div className="flex gap-1 bg-slate-950 p-1 rounded border border-slate-800/80">
                {[1, 2, 5, 10].map((spd) => (
                  <button
                    id={`speed-btn-${spd}`}
                    key={spd}
                    onClick={() => onChangeSpeed(spd)}
                    className={`flex-1 py-1 text-xs font-mono font-bold rounded transition ${
                      activeRaid.playSpeed === spd 
                        ? "bg-slate-800 text-amber-400 shadow-inner" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-xs text-slate-500 font-mono">No Active Raid. Prepare gear and select a deploy point on the map list.</span>
            </div>
          )}
        </div>

      </div>

      {/* CENTER & RIGHT COLUMNS: RAID SIMULATION TRACKER & LOGS */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* TACTICAL MAP SELECTOR / STAGE STATUS */}
        {activeRaid.isActive && activeRaid.map ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-amber-500" size={18} />
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  Raid: {activeRaid.map.name}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 text-amber-400 font-bold">
                {activeRaid.status.toUpperCase()}
              </span>
            </div>

            {/* PROCEDURAL MAP VISUAL TILES TRACK */}
            <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-2">Procedural Room Tiles Sequence</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mt-1 select-none scrollbar-thin">
              {activeRaid.tiles.map((tile, idx) => {
                const isPassed = idx < activeRaid.currentStage;
                const isCurrent = idx === activeRaid.currentStage;
                const isNext = idx === activeRaid.currentStage + 1;
                
                return (
                  <div 
                    key={idx} 
                    className={`flex-shrink-0 px-2.5 py-2 rounded border font-mono text-[9px] min-w-[100px] text-center transition ${
                      isCurrent 
                        ? "bg-amber-950/40 border-amber-500 text-amber-400 font-bold scale-105 shadow shadow-amber-500/20" 
                        : isPassed 
                          ? "bg-emerald-950/10 border-emerald-900/60 text-emerald-500" 
                          : isNext 
                            ? "bg-slate-900 border-slate-700 text-slate-300"
                            : "bg-slate-950/60 border-slate-900/40 text-slate-600"
                    }`}
                  >
                    <div className="uppercase text-[7px] opacity-60">Tile {idx}</div>
                    <div className="truncate font-bold mt-0.5">{tile.name}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/60 pt-2">
              <span>Infiltration</span>
              <span>Raid Progress: {Math.floor((activeRaid.currentStage / (activeRaid.tiles.length || 1)) * 100)}%</span>
              <span>Extraction Zone</span>
            </div>

            {/* ACTIVE ENCOUNTER PANEL */}
            <AnimatePresence mode="wait">
              {activeRaid.status === "combat" && activeRaid.combatTarget && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-5 p-4 bg-red-950/20 border border-red-900 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-950 rounded border border-red-800 text-red-500 animate-pulse">
                      <Crosshair size={22} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-red-400/80 uppercase font-bold tracking-wider">Hostile Combat Contact</div>
                      <div className="text-base font-bold text-white font-mono">{activeRaid.combatTarget.name}</div>
                    </div>
                  </div>

                  {/* ENEMY HP BAR */}
                  {(() => {
                    const enemyPartList = Object.values(activeRaid.combatTarget.bodyParts) as BodyPart[];
                    const enemyCurrentHp = enemyPartList.reduce((acc, p) => acc + p.current, 0);
                    const enemyMaxHp = enemyPartList.reduce((acc, p) => acc + p.max, 0);
                    return (
                      <div className="w-full md:w-48 text-right">
                        <div className="flex justify-between text-xs font-mono text-red-400 mb-1">
                          <span>HP:</span>
                          <span>{enemyCurrentHp} / {enemyMaxHp}</span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded overflow-hidden border border-red-900/60">
                          <div 
                            className="h-full bg-red-600" 
                            style={{ width: `${(enemyCurrentHp / enemyMaxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* DEPLOYMENT SELECTOR IF NOT IN RAID */
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="text-slate-400" size={18} /> Tactician Deployment Map
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Choose a deployment zone below. Ensure your hydration, energy, and signature firearm modifications are optimal before deploying. PMC automatically loots, fights, and seeks extraction!
            </p>

            <div className="space-y-4">
              {ALL_MAPS.map((map) => {
                const isLocked = pmc.level < map.levelRequired;
                
                return (
                  <div 
                    key={map.id}
                    className={`p-4 rounded-lg border transition flex flex-col md:flex-row items-center justify-between gap-4 ${
                      isLocked 
                        ? "bg-slate-950/60 border-slate-900 opacity-60 cursor-not-allowed" 
                        : "bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-mono text-slate-200`}>
                          {map.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          map.difficulty === "Easy" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900" :
                          map.difficulty === "Medium" ? "bg-amber-950/60 text-amber-400 border border-amber-900" :
                          "bg-red-950/60 text-red-400 border border-red-900"
                        }`}>
                          {map.difficulty}
                        </span>
                        {isLocked && (
                          <span className="text-[10px] text-red-500 font-mono">
                            Requires Level {map.levelRequired}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{map.description}</p>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2.5 text-[10px] font-mono text-slate-400">
                        <div>
                          <span className="text-slate-600">Loot Tier:</span> x{map.lootMultiplier.toFixed(1)}
                        </div>
                        <div>
                          <span className="text-slate-600">Danger:</span> {Math.floor(map.scavSpawnChance * 100)}%
                        </div>
                        <div>
                          <span className="text-slate-600">Sector Depth:</span> {map.stagesCount} stages
                        </div>
                      </div>
                    </div>

                    <div>
                      {!isLocked ? (
                        <button
                          id={`deploy-btn-${map.id}`}
                          onClick={() => onDeployRaid(map.id)}
                          className="w-full md:w-auto px-4 py-2 rounded-md bg-amber-500 text-slate-950 font-mono font-bold text-xs hover:bg-amber-400 transition flex items-center gap-1.5"
                        >
                          DEPLOY RAID <ArrowRight size={12} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full md:w-auto px-4 py-2 rounded-md bg-slate-900 text-slate-600 font-mono font-bold text-xs border border-slate-800"
                        >
                          LOCKED
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TERMINAL / LOGS INTERFACE */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex-1 flex flex-col overflow-hidden min-h-[300px] max-h-[500px]">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              PMC Encrypted Tactical Feeds
            </span>
            <span>Raid Events Log</span>
          </div>

          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950/40 text-xs font-mono select-text selection:bg-slate-800 selection:text-white">
            {activeRaid.logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 italic">
                Logs will populate automatically as raid progresses...
              </div>
            ) : (
              activeRaid.logs.map((log) => (
                <div key={log.id} className={`flex items-start gap-2.5 leading-relaxed py-0.5 ${getLogStyle(log.type)}`}>
                  <span className="text-slate-600 select-none font-bold">[{log.timestamp}]</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>

          {/* LOOT SECURED AND GATHERED PANEL — during raid */}
          {activeRaid.isActive && (
            <div className="bg-slate-950 border-t border-slate-800 p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BackPack Loot */}
              <div>
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1">
                  Backpack Inventory (Lost if KIA)
                </span>
                <div className="flex flex-wrap gap-1 bg-slate-900 p-2 rounded min-h-[44px] border border-slate-800/80">
                  {raid.lootFound.length === 0 ? (
                    <span className="text-[10px] text-slate-600 font-mono italic">Backpack empty</span>
                  ) : (
                    raid.lootFound.map((entry, index) => (
                      <div 
                        key={index} 
                        className="px-2 py-1 bg-slate-950 text-slate-300 rounded border border-slate-800 text-[10px] font-mono flex items-center gap-1.5"
                        title={entry.item.description}
                      >
                        <Package size={10} className="text-slate-500" />
                        {entry.item.name} {entry.quantity > 1 ? `x${entry.quantity}` : ""}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Secure Container Loot */}
              <div>
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-400" /> Secure Container (Saved if KIA)
                </span>
                <div className="flex flex-wrap gap-1 bg-slate-900 p-2 rounded min-h-[44px] border border-slate-800/80">
                  {raid.secureContainerSaved.length === 0 ? (
                    <span className="text-[10px] text-slate-600 font-mono italic">Secure container empty</span>
                  ) : (
                    raid.secureContainerSaved.map((entry, index) => (
                      <div 
                        key={index} 
                        className="px-2 py-1 bg-emerald-950/20 text-emerald-400 rounded border border-emerald-900/40 text-[10px] font-mono flex items-center gap-1"
                        title={entry.item.description}
                      >
                        <Package size={10} className="text-emerald-500" />
                        {entry.item.name} {entry.quantity > 1 ? `x${entry.quantity}` : ""}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* POST-RAID SUMMARY — after raid ends */}
          {!activeRaid.isActive && activeRaid.map && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
              {/* Status Banner */}
              <div className={`p-3 rounded border text-center text-xs font-mono font-bold uppercase tracking-wider ${
                activeRaid.status === "extracted" 
                  ? "bg-emerald-950/30 border-emerald-900 text-emerald-400" 
                  : "bg-red-950/30 border-red-900 text-red-400"
              }`}>
                {activeRaid.status === "extracted" ? "Extraction Successful" : "PMC Killed in Action"}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Secure Container — always saved */}
                <div>
                  <span className="text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-400" /> Secure Container (Saved to Stash)
                  </span>
                  <div className="flex flex-wrap gap-1 bg-slate-950 p-2 rounded min-h-[44px] border border-slate-800/80">
                    {raid.secureContainerSaved.length === 0 ? (
                      <span className="text-[10px] text-slate-600 font-mono italic">Secure container empty</span>
                    ) : (
                      raid.secureContainerSaved.map((entry, index) => (
                        <div 
                          key={index} 
                          className="px-2 py-1 bg-emerald-950/20 text-emerald-400 rounded border border-emerald-900/40 text-[10px] font-mono flex items-center gap-1"
                          title={entry.item.description}
                        >
                          <Package size={10} className="text-emerald-500" />
                          {entry.item.name} {entry.quantity > 1 ? `x${entry.quantity}` : ""}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Backpack — depends on outcome */}
                <div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 flex items-center gap-1 ${
                    activeRaid.status === "extracted" ? "text-emerald-500" : "text-red-500"
                  }`}>
                    <Package size={11} className={activeRaid.status === "extracted" ? "text-emerald-400" : "text-red-400"} /> 
                    Backpack {activeRaid.status === "extracted" ? "(Moved to Stash)" : "(Lost — KIA)"}
                  </span>
                  <div className="flex flex-wrap gap-1 bg-slate-950 p-2 rounded min-h-[44px] border border-slate-800/80">
                    {raid.lootFound.length === 0 ? (
                      <span className="text-[10px] text-slate-600 font-mono italic">Backpack empty</span>
                    ) : (
                      raid.lootFound.map((entry, index) => (
                        <div 
                          key={index} 
                          className={`px-2 py-1 rounded border text-[10px] font-mono flex items-center gap-1.5 ${
                            activeRaid.status === "extracted" 
                              ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/40" 
                              : "bg-red-950/20 text-red-400 border-red-900/40 line-through opacity-60"
                          }`}
                          title={entry.item.description}
                        >
                          <Package size={10} className={activeRaid.status === "extracted" ? "text-emerald-500" : "text-red-500"} />
                          {entry.item.name} {entry.quantity > 1 ? `x${entry.quantity}` : ""}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
