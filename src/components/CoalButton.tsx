'use client';

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles = {
  primary:
    "relative bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent1)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent2)_22%,transparent)] hover:scale-[1.03] focus-visible:ring-2 ring-accent",
  cta:
    "relative bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent1)] text-white shadow-[0_10px_36px_color-mix(in_srgb,var(--color-accent2)_28%,transparent)] hover:shadow-[0_12px_42px_color-mix(in_srgb,var(--color-accent1)_28%,transparent)] hover:scale-[1.04] ring-accent",
  secondary:
    "relative border border-white/15 bg-white/5 text-white shadow-md hover:bg-white/10 hover:scale-[1.02] focus-visible:ring-2 ring-electric",
  ghost:
    "relative border border-transparent bg-transparent text-white/85 hover:bg-white/10 focus-visible:ring-2 ring-electric",
  danger:
    "relative bg-[var(--color-accent2)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent2)_22%,transparent)] hover:scale-[1.03] focus-visible:ring-2 ring-accent",
} as const;

const sizeStyles = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-lg",
  xl: "h-14 px-7 text-lg",
  icon: "flex h-10 w-10 items-center justify-center p-0",
} as const;

export type CoalButtonVariant = keyof typeof variantStyles;
export type CoalButtonSize = keyof typeof sizeStyles;

export interface CoalButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CoalButtonVariant;
  size?: CoalButtonSize;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  isLoading?: boolean;
}

const CoalButton = forwardRef<HTMLButtonElement, CoalButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      icon,
      trailingIcon,
      disabled,
      isLoading,
      ...props
    },
    ref,
  ) => {
    const composedClassName = cn(
      "group inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-offset-2 select-none",
      "will-change-transform will-change-shadow",
      "active:scale-[0.98]",
      variantStyles[variant],
      sizeStyles[size],
      (disabled || isLoading) &&
        "pointer-events-none cursor-not-allowed opacity-60 grayscale",
      className,
    );

    return (
      <button
        ref={ref}
        className={composedClassName}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-live={isLoading ? "polite" : undefined}
        {...props}
      >
        {/* Shine overlay */}
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-12deg] bg-white/30 opacity-0 transition-opacity duration-200 group-hover:opacity-40" style={{
            animation: "shine 1.2s linear 1",
          }} />
        </span>
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
        ) : (
          icon && <span className="flex items-center mr-1">{icon}</span>
        )}
        <span className="whitespace-nowrap drop-shadow-sm tracking-wide">{children}</span>
        {trailingIcon && <span className="flex items-center ml-1">{trailingIcon}</span>}
      </button>
    );
  },
);

CoalButton.displayName = "CoalButton";

export default CoalButton;
