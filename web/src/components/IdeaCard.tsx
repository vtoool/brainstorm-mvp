"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const gradientPalette = [
  "from-emerald-400/50 via-teal-300/40 to-sky-300/40",
  "from-sky-400/45 via-indigo-300/35 to-purple-300/45",
  "from-amber-300/45 via-orange-200/35 to-rose-300/45",
  "from-fuchsia-300/45 via-purple-300/35 to-emerald-300/45",
  "from-cyan-300/45 via-sky-200/35 to-emerald-200/45",
  "from-lime-300/45 via-emerald-200/35 to-teal-300/45",
];

const tabPalette = [
  "bg-emerald-500/85",
  "bg-sky-500/85",
  "bg-amber-500/85",
  "bg-fuchsia-500/85",
  "bg-cyan-500/85",
  "bg-lime-500/85",
];

const iconPalette = ["💡", "📂", "🚀", "🎉", "🧠", "🎈"];

export function IdeaCard({ title, description }: { title: string; description?: string | null }) {
  const { gradientClass, tabClass, icon, folderIndex, initial } = useMemo(() => {
    const seedSource = `${title}-${description ?? ""}`;
    let hash = 0;
    for (let index = 0; index < seedSource.length; index += 1) {
      hash = (hash + seedSource.charCodeAt(index) * (index + 1)) % 997;
    }
    const gradientClass = gradientPalette[hash % gradientPalette.length];
    const tabClass = tabPalette[hash % tabPalette.length];
    const icon = iconPalette[hash % iconPalette.length];
    const folderIndex = ((hash % 99) + 1).toString().padStart(2, "0");
    const trimmedTitle = title.trim();
    const initial = trimmedTitle ? trimmedTitle[0]!.toUpperCase() : "★";
    return { gradientClass, tabClass, icon, folderIndex, initial };
  }, [description, title]);

  return (
    <motion.article
      whileHover={{ y: -6, rotate: -0.5 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={`group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${gradientClass} p-[1px]`}
    >
      <div className="relative h-full rounded-[1.65rem] border border-white/10 bg-[color-mix(in_srgb,var(--panel)_88%,white_12%)] p-6 shadow-[0_24px_45px_rgba(14,165,233,0.18)] transition-shadow duration-300 group-hover:shadow-[0_34px_65px_rgba(56,189,248,0.25)]">
        <span
          className={`pointer-events-none absolute left-6 top-0 h-8 w-24 rounded-b-[1.2rem] ${tabClass}`}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              {icon}
            </span>
            <h3 className="flex-1 break-words text-lg font-semibold leading-6" title={title}>
              {title}
            </h3>
          </div>
          {description ? (
            <p
              className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]"
              title={description}
            >
              {description}
            </p>
          ) : null}
          <div className="flex items-center justify-between text-xs text-[color-mix(in_srgb,var(--muted)_75%,white_12%)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--text)_88%,white_12%)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/30 text-sm font-bold text-[color-mix(in_srgb,var(--text)_82%,white_18%)]">
                {initial}
              </span>
              Folder
            </span>
            <span className="font-semibold text-[color-mix(in_srgb,var(--accent)_75%,var(--muted)_25%)]">#{folderIndex}</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
