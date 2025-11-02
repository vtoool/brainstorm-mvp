import type { Metadata } from "next";
import "./globals.css";

import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Green Needle",
  description: "Catch ideas. Thread them into winners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="bg-[var(--bg)] text-[var(--text)] antialiased">
        <ThemeProvider>
          <AppHeader />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
