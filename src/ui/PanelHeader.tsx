/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PanelHeader - consistent card heading row (title + optional icon + right slot).
 */
import React from "react";

interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, icon, right }) => {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-3 mb-3">
      <h3 className="text-title font-bold text-fg-hi font-mono uppercase tracking-wide flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {right}
    </div>
  );
};
