"use client";

import { forwardRef } from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] shadow-[0_12px_28px_rgba(6,19,13,0.08)] transition-colors duration-200 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
