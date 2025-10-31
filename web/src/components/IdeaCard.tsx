"use client";

import { motion } from "framer-motion";

export function IdeaCard({ title, description }: { title: string; description?: string | null }) {
  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="card"
    >
      <h3 className="text-base font-semibold leading-6">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}
    </motion.article>
  );
}
