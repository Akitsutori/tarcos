/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card - the shared panel surface. Styled purely from design tokens
 * (see src/index.css @theme). Override with className for per-screen layout.
 */
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md";
  id?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", padding = "md", id }) => {
  const pad = padding === "sm" ? "p-3" : "p-4";
  return (
    <div id={id} className={`bg-panel border border-border rounded-card ${pad} ${className}`}>
      {children}
    </div>
  );
};
