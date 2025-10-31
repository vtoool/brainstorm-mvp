"use client";

import { forwardRef } from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, rows = 4, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-200 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
