import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CoalCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function CoalCard({
  title,
  subtitle,
  action,
  footer,
  children,
  className,
}: CoalCardProps) {
  const hasHeader = Boolean(title || action || subtitle);

  return (
    <section
      className={cn("rounded-lg border border-gray-200 bg-white shadow-sm", className)}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="space-y-1 text-left">
            {typeof title === "string" ? (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            ) : (
              title
            )}
            {subtitle ? (
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      ) : null}

      <div className={cn("px-6 py-4", footer ? "pb-2" : undefined)}>{children}</div>

      {footer ? (
        <footer className="border-t border-gray-200 px-6 py-4 text-sm text-gray-500">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

