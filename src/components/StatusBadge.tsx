import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  tone: "critical" | "warning" | "safe" | "info" | "neutral";
  children: ReactNode;
}

const toneStyles: Record<StatusBadgeProps["tone"], string> = {
  critical: "border-red-200 bg-red-100 text-red-700",
  warning: "border-yellow-200 bg-yellow-100 text-yellow-700",
  safe: "border-green-200 bg-green-100 text-green-700",
  info: "border-blue-200 bg-blue-100 text-blue-700",
  neutral: "border-gray-200 bg-gray-100 text-gray-600",
};

export default function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide",
        toneStyles[tone],
      )}
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-current" />
      <span>{children}</span>
    </span>
  );
}
