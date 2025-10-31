"use client";
import "./globals.css";
import dynamic from "next/dynamic";
const AuthStatus = dynamic(() => import("@/components/AuthStatus"), { ssr: false });
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <a href="/" className="font-semibold">Brainstorm MVP</a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/ideas" className="underline">Ideas</a>
          <a href="/t/new" className="underline">New Tournament</a>
          <AuthStatus />
        </nav>
      </header>
      <div className="p-4 max-w-4xl mx-auto">{children}</div>
    </body></html>
  );
}
