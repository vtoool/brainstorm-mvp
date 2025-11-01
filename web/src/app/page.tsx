import Link from "next/link";
import {
  ArrowRight,
  Lightbulb,
  NotebookPen,
  Sparkles,
} from "lucide-react";

const features = [
  {
    name: "Capture every spark",
    description:
      "Drop ideas into your workspace the moment they appear and come back to refine them later.",
    icon: Lightbulb,
  },
  {
    name: "Stay effortlessly organized",
    description:
      "Group thoughts, add context, and keep track of what deserves your attention next.",
    icon: NotebookPen,
  },
  {
    name: "Collaborate with clarity",
    description:
      "Turn scattered notes into actionable plans and share them when you are ready to build.",
    icon: Sparkles,
  },
];

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 top-[-35%] h-[480px] bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--accent)_70%,_transparent)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,_rgba(124,92,255,0.25)_0%,_transparent_55%,_rgba(11,11,11,0.8)_100%)]" />
      </div>

      <section className="relative mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center px-6 py-24 text-center md:px-8">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-[var(--muted)] backdrop-blur">
            Built for rapid ideation
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
            Brainstorm MVP helps your next big idea feel inevitable.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-[var(--muted)] md:text-lg">
            Capture sparks of inspiration, keep them organized, and transform rough notes into ready-to-build concepts without losing momentum.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_25px_45px_-15px_rgba(124,92,255,0.55)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--accent)_70%,_white_30%)] hover:bg-[color-mix(in_oklab,var(--accent)_85%,_black_15%)]"
          >
            Start brainstorming
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/ideas"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
          >
            View your ideas
          </Link>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-6 pb-24 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.name}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_60px_-30px_rgba(15,23,42,0.8)] transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="absolute inset-0 -z-10 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,92,255,0.25)_0%,_transparent_65%)]" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Icon className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">
                  {feature.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
