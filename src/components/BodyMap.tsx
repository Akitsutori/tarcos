import React, { useState } from "react";
import { BodyPart, PMCBodyParts } from "../types";

interface BodyMapProps {
  bodyParts: PMCBodyParts;
}

export const BodyMap: React.FC<BodyMapProps> = ({ bodyParts }) => {
  const [hoveredPart, setHoveredPart] = useState<BodyPart | null>(null);

  if (!bodyParts) return null;

  // Map keys exactly
  const partsList: { [key: string]: BodyPart } = {
    head: bodyParts.head,
    thorax: bodyParts.thorax,
    stomach: bodyParts.stomach,
    leftArm: bodyParts.leftArm,
    rightArm: bodyParts.rightArm,
    leftLeg: bodyParts.leftLeg,
    rightLeg: bodyParts.rightLeg,
  };

  const getLimbDetails = (part: BodyPart) => {
    if (!part) return { pct: 0, bg: "bg-slate-800", text: "text-slate-400", border: "border-slate-700" };
    const pct = part.max > 0 ? (part.current / part.max) * 100 : 0;
    
    // Emerald / Green theme by default
    let bg = "bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400";
    let border = "border-emerald-700/60";
    let text = "text-emerald-400 font-bold";

    if (part.current <= 0) {
      bg = "bg-red-950/60 hover:bg-red-900/50 text-red-600 animate-pulse";
      border = "border-red-900/80";
      text = "text-red-500 font-bold";
    } else if (pct < 45) {
      bg = "bg-red-600/20 hover:bg-red-500/30 text-red-400";
      border = "border-red-600/50";
      text = "text-red-400 font-bold";
    } else if (pct < 80) {
      bg = "bg-amber-600/20 hover:bg-amber-500/30 text-amber-400";
      border = "border-amber-600/50";
      text = "text-amber-400 font-bold";
    }

    return { pct, bg, text, border };
  };

  const renderPartBlock = (key: string, shortLabel: string, extraClasses: string) => {
    const part = partsList[key];
    if (!part) return <div className="bg-slate-900/20 border border-slate-900/40 rounded opacity-20" />;

    const { bg, border } = getLimbDetails(part);
    const isCritical = key === "head" || key === "thorax";

    return (
      <div
        className={`relative flex flex-col items-center justify-center p-1 rounded border transition-all cursor-crosshair select-none ${bg} ${border} ${extraClasses}`}
        onMouseEnter={() => setHoveredPart(part)}
        onMouseLeave={() => setHoveredPart(null)}
      >
        <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider leading-none mb-0.5 flex items-center gap-0.5">
          {shortLabel}
          {isCritical && part.current > 0 && part.current < part.max * 0.45 && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping block" />
          )}
        </span>
        <span className="text-[9px] font-mono leading-none tracking-tighter opacity-90">
          {part.current}/{part.max}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center bg-slate-950/40 p-4 rounded-lg border border-slate-800/60 w-full">
      <div className="grid grid-cols-3 gap-2 w-full max-w-[210px]">
        {/* ROW 1: HEAD */}
        <div className="col-start-1" />
        {renderPartBlock("head", "Head", "col-start-2 row-start-1 h-11 text-center")}
        <div className="col-start-3" />

        {/* ROW 2: LEFT ARM, THORAX, RIGHT ARM */}
        {renderPartBlock("leftArm", "L-Arm", "col-start-1 row-start-2 row-span-2 h-[96px] text-center justify-center")}
        {renderPartBlock("thorax", "Thrx", "col-start-2 row-start-2 h-11 text-center")}
        {renderPartBlock("rightArm", "R-Arm", "col-start-3 row-start-2 row-span-2 h-[96px] text-center justify-center")}

        {/* ROW 3: STOMACH */}
        {renderPartBlock("stomach", "Stmc", "col-start-2 row-start-3 h-11 text-center")}

        {/* ROW 4: LEFT LEG, RIGHT LEG */}
        {renderPartBlock("leftLeg", "L-Leg", "col-start-1 row-start-4 row-span-2 h-[96px] text-center justify-center")}
        <div className="col-start-2 row-start-4 row-span-2 flex items-center justify-center select-none">
          <span className="text-[8px] font-mono text-slate-700 uppercase tracking-widest font-black rotate-90">
            VITALS
          </span>
        </div>
        {renderPartBlock("rightLeg", "R-Leg", "col-start-3 row-start-4 row-span-2 h-[96px] text-center justify-center")}
      </div>

      {/* DETAIL DISPLAY BAR */}
      <div className="mt-3.5 w-full text-center h-6 flex items-center justify-center border-t border-slate-900 pt-3">
        {hoveredPart ? (
          <div className="text-[10px] font-mono text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/40 flex items-center gap-1.5 animate-fadeIn">
            <span className="font-extrabold text-white uppercase">{hoveredPart.name}:</span>
            <span className={getLimbDetails(hoveredPart).text}>
              {hoveredPart.current} / {hoveredPart.max} HP
            </span>
            {hoveredPart.current <= 0 && <span className="text-red-500 font-extrabold animate-pulse text-[8px]">[DESTROYED]</span>}
            {(hoveredPart.id === "head" || hoveredPart.id === "thorax") && hoveredPart.current > 0 && hoveredPart.current < hoveredPart.max * 0.45 && (
              <span className="text-red-400 font-extrabold text-[8px] animate-pulse">[CRITICAL]</span>
            )}
          </div>
        ) : (
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest select-none animate-pulse">
            Hover body parts to view details
          </span>
        )}
      </div>
    </div>
  );
};
