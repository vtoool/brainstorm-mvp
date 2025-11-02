"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV_LINKS = [
  { href: "/ideas", label: "Ideas" },
  { href: "/t", label: "Tournaments" },
  { href: "/t/new", label: "New Tournament" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg)_85%,rgba(6,19,13,0.6))] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight text-[var(--text)]">
            Green <span className="text-[var(--accent)]">Needle</span>
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
            Catch ideas. Thread them into winners.
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted)] md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href === "/t" && /^\/t\/(?!new)/.test(pathname)) ||
              (link.href !== "/t" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-full px-3 py-1.5 transition-colors hover:text-[var(--text)]"
              >
                <span>{link.label}</span>
                <AnimatePresence>
                  {isActive ? (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  ) : null}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] shadow-sm sm:flex">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_80%,black_10%)] text-[var(--bg)] text-xs font-semibold">
              GN
            </span>
            <span>you@greenneedle.app</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
      <div className="md:hidden">
        <nav className="mx-auto flex w-full max-w-6xl gap-1 px-4 pb-3 pt-2 text-sm font-medium text-[var(--muted)]">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href === "/t" && /^\/t\/(?!new)/.test(pathname)) ||
              (link.href !== "/t" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex-1 rounded-xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] px-3 py-2 text-center"
              >
                <span className={isActive ? "text-[var(--text)]" : undefined}>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
