import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  tone: "critical" | "warning" | "safe" | "info" | "neutral";
  children: ReactNode;
}

const toneStyles: Record<StatusBadgeProps["tone"], string> = {
  // Restricted to 4-color palette (accent1, accent2, white, bg via alphas)
  critical: "text-[var(--color-accent2)] border-[color:var(--color-accent2)]/30 bg-[color:var(--color-accent2)]/10",
  warning: "text-[var(--color-accent2)] border-[color:var(--color-accent2)]/30 bg-transparent",
  safe: "text-[var(--color-accent1)] border-[color:var(--color-accent1)]/30 bg-[color:var(--color-accent1)]/10",
  info: "text-white border-white/20 bg-white/5",
  neutral: "text-white/80 border-white/10 bg-white/5",
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
