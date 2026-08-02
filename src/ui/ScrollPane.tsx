/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScrollPane - the standard internal-scroll wrapper for height-bounded
 * flex/grid columns. min-h-0 is required for overflow to work inside flex.
 */
import React from "react";

interface ScrollPaneProps {
  children: React.ReactNode;
  className?: string;
}

export const ScrollPane: React.FC<ScrollPaneProps> = ({ children, className = "" }) => {
  return <div className={`min-h-0 overflow-y-auto pr-1 ${className}`}>{children}</div>;
};
