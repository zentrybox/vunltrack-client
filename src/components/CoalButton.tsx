'use client';

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles = {
  primary:
    "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-900/20 hover:from-blue-700 hover:to-cyan-500 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-blue-400",
  secondary:
    "border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 text-white shadow-md hover:from-gray-800 hover:to-gray-600 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-gray-500",
  ghost:
    "border border-transparent bg-transparent text-blue-500 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300",
  danger:
    "bg-gradient-to-r from-red-600 via-red-500 to-orange-400 text-white shadow-lg shadow-red-900/20 hover:from-red-700 hover:to-orange-500 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-red-400",
} as const;

const sizeStyles = {
  md: "h-11 px-5 text-base",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-6 text-lg",
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
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-offset-2 select-none",
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
