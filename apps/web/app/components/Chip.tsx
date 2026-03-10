"use client";

import { ReactNode } from "react";

export function Chip({
  active = false,
  onClick,
  children,
  as = "button",
  className = "",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  as?: "button" | "span";
  className?: string;
}) {
  const classes = `chip ${active ? "chip-active" : ""} ${className}`;
  if (as === "span") {
    return <span className={classes}>{children}</span>;
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
