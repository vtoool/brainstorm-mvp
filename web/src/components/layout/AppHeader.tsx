"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const AuthStatus = dynamic(() => import("@/components/AuthStatus"), { ssr: false });

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur bg-black/40">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/ideas" className="font-semibold tracking-tight">
          Brainstorm <span className="text-[var(--accent)]">MVP</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[var(--muted)]">
          <Link href="/ideas" className="hover:text-[var(--text)]">
            Ideas
          </Link>
          <Link href="/t/new" className="hover:text-[var(--text)]">
            New Tournament
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
