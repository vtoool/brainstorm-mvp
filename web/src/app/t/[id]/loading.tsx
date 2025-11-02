export default function TournamentDetailLoading() {
  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="h-6 w-48 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
        <div className="h-64 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)]" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-32 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
        <div className="h-80 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)]" />
      </div>
    </div>
  );
}
