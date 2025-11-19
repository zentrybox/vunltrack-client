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
        "group relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
        "text-[var(--color-text-primary)]",
        className
      )}
      style={{ backgroundColor: "var(--color-surface)", borderColor: "rgba(30,30,30,0.35)" }}
    >
      {/* Neon accent bar */}
  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 card-accent-top opacity-85" />
      {hasHeader ? (
  <header className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-4 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="space-y-1 text-left">
              {typeof title === "string" ? (
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                {/* Puedes agregar un icono aquí si lo deseas */}
                {title}
              </h3>
            ) : (
              title
            )}
              {subtitle ? (
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent1)' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      ) : null}

  <div className={cn("px-6 py-5", footer ? "pb-2" : undefined)} style={{ color: 'var(--color-text-secondary)' }}>{children}</div>

      {footer ? (
        <footer className="border-t px-6 py-4 text-sm backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)', backgroundColor: 'transparent' }}>
          {footer}
        </footer>
      ) : null}

      {/* Animación decorativa de fondo */}
      <span className="pointer-events-none absolute inset-0 z-0 opacity-0 transition duration-500 group-hover:opacity-10" style={{ background: 'radial-gradient(ellipse at top left, color-mix(in srgb, var(--color-accent2) 18%, transparent), transparent)' }} />
    </section>
  );
}

