export default function NewTournamentLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)]"
          />
        ))}
      </div>
    </div>
  );
}
