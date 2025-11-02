import Link from "next/link";

const HIGHLIGHTS = [
  {
    title: "Harvest real signal",
    description:
      "Separate the memorable from the mediocre with collaborative shortlists, votes, and instant context.",
  },
  {
    title: "Spin up tournaments",
    description:
      "Launch bracket-style runoffs for any idea in seconds—perfect for teams that thrive on friendly competition.",
  },
  {
    title: "Stay in flow",
    description:
      "Theme-aware workspaces, keyboard-driven navigation, and thoughtful defaults keep momentum on your side.",
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col gap-16 overflow-hidden py-6 sm:py-10">
      <div className="pointer-events-none absolute inset-x-1/2 top-6 -z-10 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(38,136,89,0.18)_0%,rgba(16,43,34,0)_70%)] blur-2xl" />

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--panel)_70%,transparent)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Green Needle
        </span>
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[var(--text)] sm:text-5xl">
          Catch ideas. Thread them into tournament-ready winners.
        </h1>
        <p className="text-balance text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Green Needle helps teams transform scattered inspiration into actionable, competitive showdowns. Collect, refine, and crown the best concepts without losing the spark that started them.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/ideas"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--bg)] shadow-[0_8px_24px_rgba(38,136,89,0.35)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(38,136,89,0.45)]"
          >
            Explore Ideas
          </Link>
          <Link
            href="/t/new"
            className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--panel)_85%,transparent)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            Start a New Tournament
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl">
        <div className="grid gap-6 sm:grid-cols-3">
          {HIGHLIGHTS.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-3xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--panel)_88%,transparent)] p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(5,17,12,0.18)]"
            >
              <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">
                {highlight.title}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {highlight.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
