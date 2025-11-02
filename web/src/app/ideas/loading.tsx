export default function IdeasLoading() {
  return (
    <div className="space-y-10">
      <section className="card space-y-5">
        <div className="h-6 w-44 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
        <div className="space-y-4">
          <div className="h-11 rounded-2xl bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
          <div className="h-24 rounded-2xl bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)]"
          />
        ))}
      </section>
    </div>
  );
}
