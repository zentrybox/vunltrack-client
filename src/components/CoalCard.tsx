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
      className={cn(
        "rounded-2xl border border-gray-900/10 bg-gradient-to-br from-gray-50 via-white to-blue-50 shadow-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-1",
        "group relative overflow-hidden",
        className
      )}
    >
      {hasHeader ? (
  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50/40 via-white/60 to-blue-100/40">
          <div className="space-y-1 text-left">
              {typeof title === "string" ? (
              <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {/* Puedes agregar un icono aquí si lo deseas */}
                {title}
              </h3>
            ) : (
              title
            )}
              {subtitle ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      ) : null}

  <div className={cn("px-6 py-5 text-gray-800", footer ? "pb-2" : undefined)}>{children}</div>

      {footer ? (
        <footer className="border-t border-gray-200 px-6 py-4 text-sm text-gray-500 bg-white/60">
          {footer}
        </footer>
      ) : null}

      {/* Animación decorativa de fondo */}
  <span className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-10 transition duration-300 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-400 via-blue-200 to-transparent" />
    </section>
  );
}

