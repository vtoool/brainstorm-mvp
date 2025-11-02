# Green Needle Context Management Protocol

This protocol governs how the agent working on the Green Needle project tracks context, progress, and lessons learned. It is designed to double effectiveness by anchoring every action to the C4 goals, encouraging deliberate review, and recording Supabase changes alongside application work.

---

## 1. Core Orientation
1. **Start with the C4 Model.**
   - Before coding, skim [`docs/C4.md`](./C4.md) and capture the relevant scope elements in the "Working Notes" section below.
   - Highlight which layers (Context, Container, Component) the task touches, and note expected interactions.
2. **Define the target outcome.**
   - State the specific user-visible result or internal milestone.
   - Map each acceptance criterion to a concrete deliverable or code path.
3. **Clarify constraints.**
   - List non-negotiables (performance, security, styling) and task-specific guardrails.
   - Record dependencies that could block progress.

## 2. Context Packet Template
Maintain a living context packet for each workstream. Update it at the beginning and end of every session.

| Field | Description |
| --- | --- |
| **Task Name** | Concise name tied to an issue or request. |
| **Related C4 Nodes** | Bulleted list referencing context/container/component identifiers from `docs/C4.md`. |
| **Key Files/Modules** | Paths + brief purpose statements. |
| **Blocked On** | Items preventing progress; include owner or action to unblock. |
| **Open Questions** | Outstanding clarifications required. |
| **Next Two Actions** | Exactly two concrete, atomic steps. |
| **Timebox** | Estimated focus window (e.g., "45 minutes"). |

Store context packets chronologically in `docs/session-notes/{YYYY-MM-DD}.md` (create the folder if absent). Each packet should stand alone; when a task completes, mark it **Done** with a dated summary.

## 3. Working Notes Discipline
- Keep a single "Working Notes" subsection per active packet.
- Use timestamped bullet points (`[HH:MM]`) to log discoveries, decisions, and deviations from plan.
- When switching tasks, archive notes by copying them into the packet history and writing a one-line retrospective ("What helped?", "What hurt?").

## 4. Supabase Change Log
Manual Supabase modifications must be tracked alongside app changes.

1. Create or update `supabase/CHANGE_LOG.md` for every SQL editor execution.
2. Log entries in the following format:
   ```
   ## YYYY-MM-DD – Short Summary
   - **Task/Packet:** <link or reference>
   - **SQL Snippet:** ```sql
     -- statement
     ```
   - **Reasoning:** Why the change was needed and expected impact.
   - **Verification:** How the change was tested or validated.
   ```
3. Reference the associated change log entry in commit messages and PR descriptions when applicable.
4. If no Supabase change was necessary, explicitly state "No Supabase changes" in the session wrap-up.

## 5. Review Loop
At session end:
1. **Summarize Outcomes** – Capture delivered work, new TODOs, and unresolved questions.
2. **Error & Mistake Register** – Append to `docs/learning-log.md` with:
   - `Date`
   - `Incident`
   - `Root Cause`
   - `Preventive Action`
3. **Self-Assessment** – Rate focus, clarity, and confidence (1–5). Note one improvement for next session.
4. **Plan Next Entry** – Draft the next packet or update the "Next Two Actions" field before closing.

## 6. Continuous Improvement Ritual
- Weekly (or every 5 sessions), review the last five entries in `docs/learning-log.md`.
- Identify recurring patterns or systemic friction.
- Propose one protocol tweak and document it under **Protocol Adjustments** below. Ensure `AGENTS.md` references the latest expectations.

### Protocol Adjustments
Start this section with a dated changelog whenever the protocol evolves. Each entry should specify the adjustment, rationale, and originating lessons.

---

## 7. Quick Checklist (Pre-Commit)
- [ ] Context packet updated with latest notes.
- [ ] Supabase change log entry created or "No Supabase changes" recorded.
- [ ] Learning log updated with new insights or mistakes.
- [ ] Next session's top two actions recorded.
- [ ] Final summary references relevant C4 elements.

Adhering to this protocol ensures continuity, speeds onboarding, and keeps the Green Needle vision anchored to its C4 blueprint.
