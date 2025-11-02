export default function RoomLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-60 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-48 rounded-3xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)]"
          />
        ))}
      </div>
    </div>
  );
}
