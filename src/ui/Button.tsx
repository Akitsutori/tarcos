/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Button - the only button surface in the app. Sizes/variants come from
 * tokens so every control shares the same hit target and rhythm.
 * Buttons never wrap and never shrink (prevents the squeeze/overflow class
 * of bugs when a card is narrower than expected).
 */
import React from "react";

type ButtonVariant = "accent" | "ghost" | "info" | "success" | "danger" | "sell";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANTS: Record<ButtonVariant, string> = {
  accent: "bg-accent text-bg hover:bg-warn",
  ghost: "bg-panel text-fg-mid border border-border hover:bg-panel-hi hover:text-fg-hi",
  info: "bg-info/20 text-info border border-info/40 hover:bg-info/30",
  success: "bg-good/20 text-good border border-good/40 hover:bg-good/30",
  danger: "bg-crit/20 text-crit border border-crit/40 hover:bg-crit/30",
  sell: "bg-panel text-accent border border-accent/40 hover:bg-accent hover:text-bg",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-meta",
  md: "px-3.5 py-2 text-body",
};

export const Button: React.FC<ButtonProps> = ({ variant = "ghost", size = "sm", className = "", ...rest }) => {
  return (
    <button
      className={`font-mono font-bold rounded-control transition whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
};
