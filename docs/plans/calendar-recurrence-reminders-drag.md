# Calendar: Recurring Milestones, Reminders, Drag-to-Reschedule

Branch: `develop`
Status: implemented in this pass

## Scope (confirmed)
- **Recurring milestones** — series-level. A task repeats daily/weekly/monthly
  until an optional end date; occurrences render on the calendar; editing the
  task edits the whole series.
- **Reminders** — in-app only. Each milestone can set "remind N days before";
  the calendar flags milestones inside their reminder window (🔔). No email/cron.
- **Drag-to-reschedule** — both milestones and events can be dragged between
  day cells on the month grid to change their date. (Recurring occurrences are
  not draggable — dragging one would ambiguously shift the whole series.)

## Data model
`tasks` gains three nullable columns (migration applied to Supabase project
`two-weddings` and reflected in `supabase/schema.sql`):

- `recur_freq text check (recur_freq in ('daily','weekly','monthly'))` — null = one-off.
- `recur_until date` — optional inclusive end of the series.
- `remind_days_before int` — reminder lead time in days; null = none.

RLS is unchanged: the existing row-level `tasks_member_all` policy already
covers new columns. Events need no new columns (drag only changes `event_date`).

## New / changed files
- `lib/recurrence.js` (new) — pure helpers:
  - `expandTaskOccurrences(task, rangeStart, rangeEnd)` → array of occurrence
    dates (a one-off yields `[due]` if in range; recurring steps by freq up to
    `recur_until`/range end, capped to avoid runaway).
  - `isReminding(occDate, remindDays, status, today)` → whether an occurrence is
    inside its reminder window and not done.
- `lib/data.js` — `getTasksData` + `getCalendarData` select and map
  `recur_freq→recurFreq`, `recur_until→recurUntil`, `remind_days_before→remindDays`.
- `app/(app)/planning/actions.js` — `saveTask` writes the three new columns.
- `components/planning/TaskForm.jsx` — adds a recurrence group (frequency +
  "until" date) and a reminder select. Shared, so the Planning board gets the
  same fields.
- `components/planning/PlanningView.jsx` — thread `recurFreq/recurUntil/remindDays`
  through `blank`, `openEdit`, `handleSave`.
- `components/calendar/CalendarView.jsx`:
  - Expand recurring milestones into per-date occurrence items across the
    visible window; keep the base task id for editing.
  - Show a 🔔 indicator on milestone rows/occurrences inside their reminder window.
  - Drag-to-reschedule: day cells are drop targets; non-recurring milestone and
    event dots are draggable; dropping sets the new date (`due`/`date`) with
    optimistic UI + the existing `saveTask`/`saveEvent` actions.
- `lib/i18n/{en,vi,zh}.js` — labels for recurrence, reminder, and drag hints.

## Behavior notes
- Occurrence window: from ~1 month before today to `recur_until` or ~12 months
  out, capped at 200 occurrences per task.
- Editing any occurrence opens the base task (series-level).
- Preview/seed mode still works (optimistic UI; server actions are no-ops).

## Verification
- Node unit test for `expandTaskOccurrences` / `isReminding`.
- Migration verified against the live DB (`information_schema`).
- Read-tool verification of edited files (workspace shell mount serves stale
  copies of edits); `npm run lint` + `npm run build` on the user's machine.

## Not in scope
- Per-occurrence exceptions (skip/override a single instance), email reminders,
  timezone-aware recurrence (dates are calendar-day based).
