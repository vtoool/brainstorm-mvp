import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppHeader } from "@/components/layout/AppHeader";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Brainstorm MVP",
  description: "Swipe, sort, tournament your ideas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[var(--bg)] text-[var(--text)] antialiased`}>
        <ThemeProvider>
          <AppHeader />
          <main className="container py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
