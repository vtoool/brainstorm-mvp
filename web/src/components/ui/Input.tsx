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
        "w-full rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-200 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
