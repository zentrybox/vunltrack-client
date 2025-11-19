import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  tone: "critical" | "warning" | "safe" | "info" | "neutral";
  children: ReactNode;
}

const toneStyles: Record<StatusBadgeProps["tone"], string> = {
  // Use dark neon palette variables
  critical: "text-[var(--color-alert)] border-[color:var(--color-alert)]/30 bg-[color:var(--color-alert)]/10",
  warning: "text-[var(--color-accent1)] border-[color:var(--color-accent1)]/30 bg-[color:var(--color-accent1)]/6",
  safe: "text-[var(--color-success)] border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/8",
  info: "text-[var(--color-hover)] border-[color:var(--color-hover)]/20 bg-[color:var(--color-hover)]/8",
  neutral: "text-[var(--color-text-primary)] border-[color:rgba(255,255,255,0.06)]/10 bg-transparent",
};

export default function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        toneStyles[tone],
      )}
    >
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current/90">
        <span
          className="absolute inset-0 rounded-full bg-current/70"
          style={{ animation: "pulse-dot 1.8s ease-in-out infinite" }}
        />
      </span>
      <span>{children}</span>
    </span>
  );
}
