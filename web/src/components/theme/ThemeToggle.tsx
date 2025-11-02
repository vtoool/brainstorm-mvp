"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, isReady } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="h-10 w-10 rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] shadow-sm hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] hover:text-[var(--text)]"
    >
      {isReady ? (
        isDark ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <span className="text-xs font-medium">•</span>
      )}
    </Button>
  );
}
