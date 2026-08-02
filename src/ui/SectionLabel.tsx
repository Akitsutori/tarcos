/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SectionLabel - the standard uppercase micro-label for section titles,
 * metric labels, and chip-group headers.
 */
import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = "" }) => {
  return (
    <span className={`text-label text-fg-low font-mono font-bold uppercase tracking-wider block ${className}`}>
      {children}
    </span>
  );
};
