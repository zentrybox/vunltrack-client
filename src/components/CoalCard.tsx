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
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
        "text-white/90",
        className
      )}
    >
      {/* Neon accent bar */}
  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent1)] opacity-80" />
      {hasHeader ? (
  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-4 bg-white/5 backdrop-blur-sm">
          <div className="space-y-1 text-left">
              {typeof title === "string" ? (
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {/* Puedes agregar un icono aquí si lo deseas */}
                {title}
              </h3>
            ) : (
              title
            )}
              {subtitle ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent1)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      ) : null}

  <div className={cn("px-6 py-5", footer ? "pb-2" : undefined)}>{children}</div>

      {footer ? (
        <footer className="border-t border-white/10 px-6 py-4 text-sm text-white/80 bg-white/5 backdrop-blur-sm">
          {footer}
        </footer>
      ) : null}

      {/* Animación decorativa de fondo */}
      <span className="pointer-events-none absolute inset-0 z-0 opacity-0 transition duration-500 group-hover:opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[var(--color-accent2)] to-transparent" />
    </section>
  );
}

