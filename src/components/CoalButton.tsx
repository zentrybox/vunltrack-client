'use client';

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
  secondary:
    "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-gray-400",
  ghost:
    "border border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
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
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      variantStyles[variant],
      sizeStyles[size],
      (disabled || isLoading) &&
        "pointer-events-none cursor-not-allowed opacity-70",
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
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
        ) : (
          icon
        )}
        <span className="whitespace-nowrap">{children}</span>
        {trailingIcon}
      </button>
    );
  },
);

CoalButton.displayName = "CoalButton";

export default CoalButton;
