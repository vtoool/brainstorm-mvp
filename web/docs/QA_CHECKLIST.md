# QA Checklist – Green Needle MVP

## Ideas
- [ ] Add a new idea with title + optional description → status banner shows “Saving…” then “Saved”.
- [ ] Delete an idea → confirmation prompt appears, grid updates instantly.
- [ ] Refresh the page → ideas persist (localStorage mock).
- [ ] Verify list virtualization guard by seeding >100 ideas (only latest 100 render).

## Tournament creation
- [ ] Open `/t/new`, fill basics, pick visibility, adjust target size.
- [ ] Search + select at least two ideas → counter updates.
- [ ] Reorder seeds with arrow buttons; ensure summary updates.
- [ ] Create tournament → redirect to `/t/{id}` with bracket shown.

## Bracket management
- [ ] From `/t/{id}`, press “Start tournament” → first round opens.
- [ ] Mark winners for an open match → winner propagates, status chip updates.
- [ ] Use “Open next round” and “Close round” to change match statuses.
- [ ] Reset bracket → seeds revert, status returns to Draft.
- [ ] Refresh page → bracket state persists.

## Voting room
- [ ] Visit `/room/{code}` for tournament with open matches → left/right cards render.
- [ ] Use keyboard (← / →) to vote; confetti banner displays and next match loads.
- [ ] Refresh → already voted matches are skipped (per-device guard).

## Theme & layout
- [ ] Toggle theme from header or settings → persists across refresh.
- [ ] Inspect focus states (Tab key) for buttons and inputs.
- [ ] Test on narrow viewport (<768px): nav collapses, cards stack.

## Error handling
- [ ] Manually tamper with localStorage to throw during adapter calls → inline error messages appear (ideas page, tournaments, etc.).
- [ ] Clear local data via Settings → all mock data removed after refresh.
