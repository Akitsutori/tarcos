/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge - small uppercase status/rarity pills.
 */
import React from "react";

type BadgeTone = "accent" | "good" | "warn" | "crit" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  accent: "bg-accent text-bg",
  good: "bg-good/20 text-good border border-good/40",
  warn: "bg-warn/20 text-warn border border-warn/40",
  crit: "bg-crit/20 text-crit border border-crit/40",
  info: "bg-info/20 text-info border border-info/40",
  neutral: "bg-panel text-fg-mid border border-border",
};

export const Badge: React.FC<BadgeProps> = ({ children, tone = "neutral", className = "" }) => {
  return (
    <span className={`px-2 py-0.5 rounded-control text-label font-bold font-mono uppercase border whitespace-nowrap shrink-0 ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
};
