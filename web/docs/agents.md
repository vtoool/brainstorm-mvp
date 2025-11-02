# Green Needle Repo Agent Guide

## Prompting safely
- Scope edits to `/web` unless a task explicitly states otherwise.
- Never add binaries (images, fonts, PDFs) or touch environment variables/auth wiring. Keep the app front-end only.
- Reuse existing components (Button/Input/Textarea, motion) and respect Tailwind + CSS-variable theming.
- Keep PRs small, compiling with `npm run build` locally before completion.

## Required context packs
Read these before coding:
1. `docs/agents.md` (this file)
2. `docs/C4.md`
3. `docs/SUPABASE_TODO.md`

## House style quick hits
- TypeScript strictness: prefer explicit types, narrow `unknown`, no implicit `any`.
- CSS via Tailwind utilities with `var(--token)` values; dark mode handled by `data-theme`.
- Client components need the `"use client";` pragma.
- Avoid new dependencies; lean on mock adapters and pure helpers.

## Change budget checklist
- [ ] Only front-end changes in `/web`
- [ ] No new packages or binaries
- [ ] Theme tokens respected
- [ ] Data flow via `dataPort` (mock now, swap later)
- [ ] Tests/build pass locally

## Handy snippets
### New route page
```tsx
// app/example/page.tsx
"use client";

export default function ExamplePage() {
  return <div className="space-y-4">Hello world</div>;
}
```

### New card container
```tsx
<section className="card space-y-4">
  <h2 className="text-lg font-semibold">Title</h2>
  <p className="text-sm text-[var(--muted)]">Supporting copy.</p>
</section>
```

### Using `dataPort`
```ts
import { dataPort } from "@/lib/data";

const ideas = await dataPort.listIdeas();
```
