"use client";

import { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "subtle" | "ghost";
export type ButtonSize = "md" | "sm" | "xs" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--bg)] shadow-[0_15px_30px_rgba(54,211,153,0.25)] hover:bg-[color-mix(in_oklab,var(--accent)_85%,black_15%)]",
  secondary: "border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)]",
  subtle: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
  ghost: "border border-transparent bg-transparent text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--accent)_25%,transparent)] hover:text-[var(--text)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-10 px-4 text-sm",
  xs: "h-8 px-3 text-xs",
  icon: "h-10 w-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
