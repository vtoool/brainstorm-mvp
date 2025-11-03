"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { IdeaFolder } from "@/lib/domain/types";

const fallbackGradient = "from-emerald-400/50 via-teal-300/40 to-sky-300/40";

export interface IdeaFolderCardProps {
  folder: IdeaFolder;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export function IdeaFolderCard({ folder, isOpen, onToggle, children }: IdeaFolderCardProps) {
  const { tabStyle, colorSwatchStyle, icon, ideaCountLabel } = useMemo(() => {
    const accentColor = folder.color?.trim() || "rgba(16,185,129,0.85)";
    const tabStyle: CSSProperties = { backgroundColor: accentColor };
    const colorSwatchStyle: CSSProperties = { backgroundColor: accentColor };
    const icon = folder.icon?.trim() ? folder.icon.trim() : "🗂️";
    const ideaCountLabel = folder.ideas.length === 1 ? "1 idea" : `${folder.ideas.length} ideas`;
    return { tabStyle, colorSwatchStyle, icon, ideaCountLabel };
  }, [folder.color, folder.icon, folder.ideas.length]);

  return (
    <motion.article
      layout
      className={`group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${fallbackGradient} p-[1px]`}
    >
      <div className="relative h-full rounded-[1.65rem] border border-white/10 bg-[color-mix(in_srgb,var(--panel)_88%,white_12%)] p-6 shadow-[0_24px_45px_rgba(14,165,233,0.18)]">
        <span
          className="pointer-events-none absolute left-6 top-0 h-8 w-24 rounded-b-[1.2rem]"
          style={tabStyle}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative space-y-5">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-start justify-between gap-4 text-left"
            aria-expanded={isOpen}
          >
            <div className="flex flex-1 items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                {icon}
              </span>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold leading-6 text-[color-mix(in_srgb,var(--text)_92%,black_8%)]" title={folder.title}>
                    {folder.title}
                  </h3>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-white/50"
                    aria-hidden="true"
                    style={colorSwatchStyle}
                  />
                  {folder.theme ? (
                    <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--text)_88%,white_12%)]">
                      {folder.theme}
                    </span>
                  ) : null}
                </div>
                {folder.description ? (
                  <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]" title={folder.description}>
                    {folder.description}
                  </p>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted)_75%,white_18%)]">
                  {ideaCountLabel}
                </p>
              </div>
            </div>
            <span
              className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--panel)_92%,white_8%)] text-sm font-semibold transition ${
                isOpen ? "rotate-90" : ""
              }`}
            >
              ➤
            </span>
          </button>
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.div
                key="folder-content"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                {children}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
