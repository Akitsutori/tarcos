/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatChip - compact status pill (loadout durability, flags) used in stat
 * strips. Never wraps, so it survives narrow layouts.
 */
import React from "react";

type StatChipTone = "good" | "warn" | "crit" | "danger";

interface StatChipProps {
  children: React.ReactNode;
  tone?: StatChipTone;
  className?: string;
}

const TONES: Record<StatChipTone, string> = {
  good: "text-good border-good/40 bg-good/10",
  warn: "text-warn border-warn/40 bg-warn/10",
  crit: "text-crit border-crit/40 bg-crit/10",
  danger: "text-crit border-crit/40 bg-crit/20",
};

export const StatChip: React.FC<StatChipProps> = ({ children, tone = "good", className = "" }) => {
  return (
    <span className={`px-2 py-1 rounded-control border font-mono text-meta font-bold flex items-center gap-1.5 whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
};
