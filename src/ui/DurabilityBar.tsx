/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DurabilityBar - the single home of the resource/durability progress bar.
 * Thresholds and colors come from the good/warn/crit tokens.
 */
import React from "react";

interface DurabilityBarProps {
  label?: string;
  statusText?: string;
  current: number;
  max: number;
  className?: string;
}

const toneOf = (percent: number) => (percent >= 0.6 ? "text-good" : percent >= 0.25 ? "text-warn" : "text-crit");
const barOf = (percent: number) => (percent >= 0.6 ? "bg-good" : percent >= 0.25 ? "bg-warn" : "bg-crit");

export const DurabilityBar: React.FC<DurabilityBarProps> = ({ label, statusText, current, max, className = "" }) => {
  const percent = max > 0 ? current / max : 0;
  const width = Math.min(100, Math.max(0, percent * 100));
  return (
    <div className={className}>
      {(label || statusText) && (
        <div className="flex justify-between items-center text-meta font-mono mb-0.5">
          {label && <span className="text-fg-low">{label}</span>}
          {statusText && <span className={`font-bold ${toneOf(percent)}`}>{statusText}</span>}
        </div>
      )}
      <div className="h-1 bg-panel-2 rounded-pill overflow-hidden border border-border/50">
        <div className={`h-full rounded-pill transition-all duration-300 ${barOf(percent)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};
