/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { GameState, RaidState, ClassType, GameItem, WeaponModCategory } from "./types";
import { ALL_MAPS, buildProceduralMap } from "./data/content/maps";
import { ALL_ITEMS } from "./data/content/items";
import { INITIAL_WEAPONS } from "./data/content/weapons";
import { createInitialPMC } from "./data/construction";
import { HEAL_PART_ORDER, SURGICAL_TARGET_ORDER } from "./engine/bodyParts";
import { RaidScreen } from "./components/RaidScreen";
import { StashScreen } from "./components/StashScreen";
import { WeaponModding } from "./components/WeaponModding";
import { ProgressionScreen } from "./components/ProgressionScreen";
import {
  MapPin, PackageOpen, Hammer, TrendingUp, Info, RotateCcw, ShieldCheck
} from "lucide-react";

import { useGameSave, STORAGE_KEY } from "./hooks/useGameSave";
import { useRaidTick } from "./hooks/useRaidTick";
import { produce, current } from "immer";

/**
 * Deep-clones a fresh GameItem template from the static ALL_ITEMS catalog so
 * that equipped/consumed instances never alias the catalog.
 */
const cloneItem = (item: GameItem): GameItem => structuredClone(item);

/**
 * If the active medical/provision kit is depleted but a backup copy remains
 * in the stash entry, swap to the backup (consume one quantity, refresh the
 * resource pool). No-op unless the kit was actually used this pass.
 */
const advanceToBackupKit = (entry: { item: GameItem; quantity: number }, used: boolean): void => {
  const { item, quantity } = entry;
  if (used && item.resourceCurrent !== undefined && item.resourceCurrent <= 0 && quantity > 0) {
    entry.quantity -= 1;
    item.resourceCurrent = item.resourceMax;
  }
};

export default function App() {
  const { gameState, setGameState, resetProgress } = useGameSave();
  const { handleTick } = useRaidTick(setGameState);

  const [activeTab, setActiveTab] = useState<"raid" | "stash" | "modding" | "progression">("raid");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Toggle play/pause simulation rate
  const handleTogglePlay = (playState: boolean) => {
    setIsPlaying(playState);
  };

  // Speed adjustment control
  const handleChangeSpeed = (speed: number) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        draft.activeRaid.playSpeed = speed;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Deploy on active raid
  const handleDeployRaid = (mapId: string) => {
    const targetMap = ALL_MAPS.find((m) => m.id === mapId);
    if (!targetMap) return;

    // Check hydration/energy. PMCs cannot deploy at 0 energy or hydration
    if (gameState.pmc.energy <= 0 || gameState.pmc.hydration <= 0) {
      alert("PMC is too starved/dehydrated to deploy! Feed them provisions or wait for hideout regeneration.");
      return;
    }

    const proceduralTiles = buildProceduralMap(targetMap);

    const startingRaidState: RaidState = {
      isActive: true,
      map: targetMap,
      tiles: proceduralTiles,
      currentStage: 0,
      status: "deploying",
      combatTarget: null,
      logs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: "00:00",
          message: `PMC deployed into tactical sector: ${targetMap.name}. Procedural track constructed of ${proceduralTiles.length} tiles. Environment: ${targetMap.difficulty} danger level.`,
          type: "info"
        }
      ],
      lootFound: [],
      secureContainerSaved: [],
      elapsedSeconds: 0,
      playSpeed: gameState.activeRaid.playSpeed || 1,
      usedMedkitDuringRaid: false,
      reinforcementsSpawnedThisTile: 0,
      killsByTier: { Scav: 0, PMC: 0, Boss: 0 }
    };

    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        draft.activeRaid = startingRaidState;
        draft.selectedMapId = mapId;
        draft.pmc.isDead = false;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    setIsPlaying(true);
    setActiveTab("raid");
  };

  // Emergency Disconnect / KIA
  const handleCancelRaid = () => {
    if (!confirm("Initiating emergency disconnect will trigger immediate KIA status. All un-secured backpack loot will be lost. Confirm disconnect?")) {
      return;
    }

    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const raid = draft.activeRaid;
        const pmc = draft.pmc;

        raid.status = "kia";
        pmc.bodyParts.head.current = 0;
        pmc.bodyParts.thorax.current = 0;
        pmc.kiaCount++;
        pmc.raidsCount++;
        draft.pastRaidOutcomes.push("kia");
        raid.isActive = false;

        // Secure container saved
        raid.secureContainerSaved.forEach((containerEntry) => {
          const stashEntry = draft.stash.items.find(i => i.item.id === containerEntry.item.id);
          if (stashEntry) {
            stashEntry.quantity += containerEntry.quantity;
          } else {
            draft.stash.items.push({ item: containerEntry.item, quantity: containerEntry.quantity });
          }
        });

        pmc.survivalRate = Math.floor((pmc.survivedCount / pmc.raidsCount) * 100);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    setIsPlaying(false);
  };

  // SELL STASH ITEM
  const handleSellItem = (itemId: string, quantity: number) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const stashEntry = draft.stash.items.find((i) => i.item.id === itemId);

        if (stashEntry && stashEntry.quantity >= quantity) {
          stashEntry.quantity -= quantity;
          draft.stash.roubles += stashEntry.item.value * quantity;

          // Clean out empty slots
          draft.stash.items = draft.stash.items.filter((i) => i.quantity > 0);
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // BUY ITEM FROM TRADER
  const handleBuyItem = (itemId: string, cost: number) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        if (draft.stash.roubles < cost) return;
        const targetItem = ALL_ITEMS[itemId];
        if (!targetItem) return;

        draft.stash.roubles -= cost;

        // Medical items: single entry, quantity = additional backup kits
        if (targetItem.type === "medical" || targetItem.type === "provision") {
          const existing = draft.stash.items.find((e) => e.item.id === itemId);
          if (existing) {
            existing.quantity++;
          } else {
            draft.stash.items.push({ item: cloneItem(targetItem), quantity: 0 });
          }
        } else {
          const stashEntry = draft.stash.items.find((i) => i.item.id === itemId);
          if (stashEntry) {
            stashEntry.quantity++;
          } else {
            draft.stash.items.push({ item: cloneItem(targetItem), quantity: 1 });
          }
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // OUT-OF-RAID CONSUMPTION
  const handleConsumeItem = (itemId: string) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const target = draft.stash.items.find(
          (e) => e.item.id === itemId && (e.quantity > 0 || (e.item.resourceCurrent !== undefined && e.item.resourceCurrent > 0))
        );
        if (!target) return;

        const item = target.item;
        let used = false;

        const isSurgicalKit = item.medicalSubType === "surgical";
        const isMedkit = item.medicalSubType === "medkit";
        const isProvision = item.type === "provision";

        if (isMedkit) {
          const partIds = HEAL_PART_ORDER;
          for (const partId of partIds) {
            const part = draft.pmc.bodyParts[partId];
            if (part.current <= 0 || part.current >= part.max) continue;

            let remaining = part.max - part.current;
            while (remaining > 0) {
              if (item.resourceCurrent !== undefined && item.resourceCurrent > 0) {
                const heal = Math.min(remaining, item.resourceCurrent);
                part.current += heal;
                item.resourceCurrent -= heal;
                remaining -= heal;
                used = true;
              } else if (target.quantity > 0) {
                target.quantity--;
                item.resourceCurrent = item.resourceMax;
              } else {
                break;
              }
            }
            if (remaining > 0) break;
          }
          advanceToBackupKit(target, used);
        }

        if (isSurgicalKit) {
          const surgicalTargetOrder = SURGICAL_TARGET_ORDER;
          for (const partId of surgicalTargetOrder) {
            const part = draft.pmc.bodyParts[partId];
            if (part.current !== 0) continue;

            if (item.resourceCurrent !== undefined && item.resourceCurrent > 0) {
              part.current = 1;
              item.resourceCurrent--;
              used = true;
            } else if (target.quantity > 0) {
              target.quantity--;
              item.resourceCurrent = item.resourceMax;
            } else {
              break;
            }
          }
          advanceToBackupKit(target, used);
        }

        if (isProvision) {
          const isHydration = item.provisionType === "hydration";
          const maxStat = isHydration ? draft.pmc.maxHydration : draft.pmc.maxEnergy;
          const currentStat = isHydration ? draft.pmc.hydration : draft.pmc.energy;
          let remaining = maxStat - currentStat;

          while (remaining > 0) {
            if (item.resourceCurrent !== undefined && item.resourceCurrent > 0) {
              const restore = Math.min(remaining, item.resourceCurrent);
              if (isHydration) draft.pmc.hydration += restore;
              else draft.pmc.energy += restore;
              item.resourceCurrent -= restore;
              remaining -= restore;
              used = true;
            } else if (target.quantity > 0) {
              target.quantity--;
              item.resourceCurrent = item.resourceMax;
            } else {
              break;
            }
          }
          advanceToBackupKit(target, used);
        }

        if (used) {
          // Remove entries that are fully depleted (rc=0, qty=0)
          draft.stash.items = draft.stash.items.filter(
            (i) => i.quantity > 0 || (i.item.resourceCurrent !== undefined && i.item.resourceCurrent > 0)
          );
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // EQUIP WEAPON
  const handleEquipWeapon = (weaponId: string) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        draft.stash.equippedWeaponId = weaponId;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // EQUIP ARMOR / HELMET
  const handleEquipArmor = (itemId: string) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const item = ALL_ITEMS[itemId];
        if (!item) return;

        const stashEntry = draft.stash.items.find((e: { item: GameItem; quantity: number }) => e.item.id === itemId && e.quantity > 0);
        if (!stashEntry) return;

        if (item.type === "helmet") {
          const oldHelmet = draft.pmc.equippedHelmet;
          draft.pmc.equippedHelmet = cloneItem(item);
          if (oldHelmet) {
            const existing = draft.stash.items.find((e: { item: GameItem; quantity: number }) => e.item.id === oldHelmet.id);
            if (existing) existing.quantity++;
            else draft.stash.items.push({ item: oldHelmet, quantity: 1 });
          }
          stashEntry.quantity--;
          if (stashEntry.quantity <= 0) {
            const idx = draft.stash.items.indexOf(stashEntry);
            draft.stash.items.splice(idx, 1);
          }
        } else if (item.type === "armor") {
          const oldArmor = draft.pmc.equippedArmor;
          draft.pmc.equippedArmor = cloneItem(item);
          if (oldArmor) {
            const existing = draft.stash.items.find((e: { item: GameItem; quantity: number }) => e.item.id === oldArmor.id);
            if (existing) existing.quantity++;
            else draft.stash.items.push({ item: oldArmor, quantity: 1 });
          }
          stashEntry.quantity--;
          if (stashEntry.quantity <= 0) {
            const idx = draft.stash.items.indexOf(stashEntry);
            draft.stash.items.splice(idx, 1);
          }
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ATTACH WEAPON MOD PART
  const handleEquipMod = (weaponId: string, category: WeaponModCategory, modItem: GameItem) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const weapon = draft.stash.weapons.find((w) => w.id === weaponId);
        const stashEntry = draft.stash.items.find((i) => i.item.id === modItem.id);

        if (weapon && stashEntry && stashEntry.quantity > 0) {
          // Return existing mod to stash if present
          const oldMod = weapon.mods[category];
          if (oldMod) {
            const oldStashEntry = draft.stash.items.find((i) => i.item.id === oldMod.id);
            if (oldStashEntry) {
              oldStashEntry.quantity++;
            } else {
              draft.stash.items.push({ item: oldMod, quantity: 1 });
            }
          }

          // Equip new mod
          weapon.mods[category] = modItem;
          stashEntry.quantity--;

          // Clean empty entries
          draft.stash.items = draft.stash.items.filter((i) => i.quantity > 0);
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // UNEQUIP WEAPON MOD PART
  const handleUnequipMod = (weaponId: string, category: WeaponModCategory) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const weapon = draft.stash.weapons.find((w) => w.id === weaponId);
        if (!weapon) return;

        const mod = weapon.mods[category];
        if (mod) {
          // Remove mod
          weapon.mods[category] = null;

          // Return to stash
          const stashEntry = draft.stash.items.find((i) => i.item.id === mod.id);
          if (stashEntry) {
            stashEntry.quantity++;
          } else {
            draft.stash.items.push({ item: mod, quantity: 1 });
          }
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // CHANGE PMC CLASS SPECIALIZATION
  const handleChangeClass = (classType: ClassType) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        // Generate new class core stats but keep level, xp, and skills
        const freshPMC = createInitialPMC(classType);

        // Preserve level & skills progression
        freshPMC.level = draft.pmc.level;
        freshPMC.xp = draft.pmc.xp;
        freshPMC.maxXp = draft.pmc.maxXp;
        freshPMC.skills = current(draft.pmc.skills);

        // Carry statistics
        freshPMC.raidsCount = draft.pmc.raidsCount;
        freshPMC.survivedCount = draft.pmc.survivedCount;
        freshPMC.kiaCount = draft.pmc.kiaCount;
        freshPMC.killsCount = draft.pmc.killsCount;
        freshPMC.survivalRate = draft.pmc.survivalRate;

        // Check if signature weapon is in stash, if not add it
        const sigWeapon = INITIAL_WEAPONS[classType];
        const hasWeapon = draft.stash.weapons.some((w) => w.id === sigWeapon.id);

        if (!hasWeapon) {
          draft.stash.weapons.push({ ...sigWeapon });
        }

        draft.pmc = freshPMC;
        draft.stash.equippedWeaponId = sigWeapon.id;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // HIDEOUT STATION UPGRADE
  const handleUpgradeModule = (moduleId: string) => {
    setGameState((prev) => {
      const next = produce(prev, (draft) => {
        const module = draft.hideout[moduleId as keyof typeof draft.hideout];
        if (!module || module.level >= module.maxLevel) return;

        const nextLvl = module.level + 1;
        const upgradeReqs = module.upgrades[nextLvl];
        if (!upgradeReqs) return;

        // Double-check funds
        if (draft.stash.roubles < upgradeReqs.cost) return;

        // Double-check barter quantities
        let possible = true;
        upgradeReqs.requirements.forEach((req) => {
          const stashEntry = draft.stash.items.find((i) => i.item.id === req.itemId);
          if (!stashEntry || stashEntry.quantity < req.quantity) {
            possible = false;
          }
        });

        if (possible) {
          // Subtract roubles
          draft.stash.roubles -= upgradeReqs.cost;

          // Subtract barter requirements
          upgradeReqs.requirements.forEach((req) => {
            const stashEntry = draft.stash.items.find((i) => i.item.id === req.itemId);
            if (stashEntry) {
              stashEntry.quantity -= req.quantity;
            }
          });

          // Level up module
          module.level = nextLvl;

          // Filter out empty items
          draft.stash.items = draft.stash.items.filter((i) => i.quantity > 0);
        }
      });
      if (next !== prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // FULL RESET PROGRESSION
  const handleResetProgress = () => {
    const reset = resetProgress();
    if (reset) {
      setIsPlaying(false);
      setActiveTab("raid");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">

      {/* GLOBAL HIGH-TECH MILITARY HEADER */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-50 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded text-slate-950 font-black tracking-tighter text-sm font-mono">
            T.A.R.C.O.S
          </div>
          <div>
            <h1 className="text-md font-black tracking-widest uppercase text-white font-sans flex items-center gap-2">
              <span className="text-amber-500 text-[10px] font-mono border border-amber-900 rounded px-1 py-0.2">Tactical Armed Roguelike Combat Observation Simulator</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">Real-Time Autonomous PMC Simulation & Combat Monitor</p>
          </div>
        </div>

        {/* PERSISTENT GLOBAL METRICS PANEL */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold block">Liquid Funds</span>
            <span className="text-amber-500 font-bold">₽{gameState.stash.roubles.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="text-right">
            <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold block">Operator Skill</span>
            <span className="text-slate-200 font-bold">{gameState.pmc.classType} (Lvl {gameState.pmc.level})</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <button
            id="wipe-profile-btn"
            onClick={handleResetProgress}
            className="p-1.5 rounded bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-900 text-slate-500 hover:text-red-400 transition"
            title="Reset profile progression"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </header>

      {/* PRIMARY VIEWS SWITCHER SUB-HEADER */}
      <nav className="bg-slate-900/30 border-b border-slate-900 px-4 md:px-8 py-2 flex gap-1 overflow-x-auto">
        <button
          id="tab-raid-btn"
          onClick={() => setActiveTab("raid")}
          className={`px-4 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 ${activeTab === "raid"
            ? "bg-slate-800 text-amber-500 border border-slate-700"
            : "text-slate-500 hover:text-slate-300"
            }`}
        >
          <MapPin size={13} />
          {gameState.activeRaid.isActive ? (
            <span className="flex items-center gap-1.5">
              Raid Monitor
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            </span>
          ) : "Deploy Raid"}
        </button>

        <button
          id="tab-stash-btn"
          onClick={() => setActiveTab("stash")}
          className={`px-4 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 ${activeTab === "stash"
            ? "bg-slate-800 text-amber-500 border border-slate-700"
            : "text-slate-500 hover:text-slate-300"
            }`}
        >
          <PackageOpen size={13} /> Stash & Market
        </button>

        <button
          id="tab-modding-btn"
          onClick={() => setActiveTab("modding")}
          className={`px-4 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 ${activeTab === "modding"
            ? "bg-slate-800 text-amber-500 border border-slate-700"
            : "text-slate-500 hover:text-slate-300"
            }`}
        >
          <Hammer size={13} /> Mod Bench
        </button>

        <button
          id="tab-progression-btn"
          onClick={() => setActiveTab("progression")}
          className={`px-4 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 ${activeTab === "progression"
            ? "bg-slate-800 text-amber-500 border border-slate-700"
            : "text-slate-500 hover:text-slate-300"
            }`}
        >
          <TrendingUp size={13} /> Hideout & Skills
        </button>
      </nav>

      {/* CENTRAL CORE CONTENT PORT */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === "raid" && (
          <RaidScreen
            gameState={gameState}
            onTick={handleTick}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={handleChangeSpeed}
            onDeployRaid={handleDeployRaid}
            onCancelRaid={handleCancelRaid}
            isPlaying={isPlaying}
          />
        )}

        {activeTab === "stash" && (
          <StashScreen
            gameState={gameState}
            onSellItem={handleSellItem}
            onBuyItem={handleBuyItem}
            onConsumeItem={handleConsumeItem}
            onEquipWeapon={handleEquipWeapon}
            onEquipArmor={handleEquipArmor}
          />
        )}

        {activeTab === "modding" && (
          <WeaponModding
            gameState={gameState}
            onEquipMod={handleEquipMod}
            onUnequipMod={handleUnequipMod}
          />
        )}

        {activeTab === "progression" && (
          <ProgressionScreen
            gameState={gameState}
            onUpgradeModule={handleUpgradeModule}
            onChangeClass={handleChangeClass}
          />
        )}
      </main>

      {/* FOOTER ACCENTS */}
      <footer className="bg-slate-950/80 border-t border-slate-900 py-3.5 px-4 md:px-8 text-center text-[10px] font-mono text-slate-600 flex flex-col md:flex-row items-center justify-between gap-2">
        <span>Escape from Tarkov: Autonomous Zero-Player Roguelike Simulator © 2026</span>
        <span className="flex items-center gap-1.5">
          <Info size={11} /> Hideout passive healing is active in the background. Close window to return later.
        </span>
      </footer>

    </div>
  );
}
