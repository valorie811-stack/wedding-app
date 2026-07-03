# Editing Task Milestones from the Calendar

Branch: `develop`
Status: implemented in this pass

## Goal

The Event Scheduler shows two kinds of dated items: **events** (editable as of the
previous pass) and **task milestones** (tasks with a due date, still read-only).
This adds full **add / edit / remove** for task milestones directly from the
calendar, matching how events already work.

## Current state

- `components/calendar/CalendarView.jsx` normalizes `tasks` into `milestone`
  items (by `due` date) and renders them read-only in the day-detail / upcoming
  lists.
- Task CRUD already exists: `app/(app)/planning/actions.js` →
  `saveTask({id,code,title,due,status,assignee})`, `deleteTask(id)`,
  `updateTaskStatus(id,status)`.
- The task form lives inline inside `PlanningView.jsx` as `TaskForm`.
- `getCalendarData()` already returns tasks with `id,title,due,status,assignee,code`.
- The `tasks` table already has every needed column — **no schema migration**.

## Changes

### Refactor (shared form)
- `components/planning/TaskForm.jsx` (new) — extract the existing `TaskForm`
  into its own exported component so both the planning board and the calendar
  use one source of truth. Adds an optional `onDelete` prop that renders a
  Delete button when editing (used by the calendar; the board keeps its
  card-level delete).
- `components/planning/PlanningView.jsx` — remove the inline `TaskForm`, import
  the shared one. No behavior change.

### Server actions
- `app/(app)/planning/actions.js` — add `revalidatePath("/scheduler")` to
  `saveTask`, `updateTaskStatus`, and `deleteTask` so milestone edits made from
  the calendar refresh the scheduler view too.

### CalendarView
- Keep a local optimistic `tasks` state (seeded from props), like events.
- Carry `id` on milestone items so they can be looked up for editing.
- Milestone rows in the day-detail become clickable to edit, with edit/delete
  icons (mirrors the event rows).
- Day-detail gains a second affordance: **+ Add milestone** on the selected day
  (alongside **+ Add event**).
- Reuse the shared `TaskForm` in a modal; save/delete via the existing planning
  server actions with optimistic UI.

## Behavior notes

- New milestones default `code` to the current scope (shared when scope is
  BOTH) and `status` to `todo`, with the clicked day as the due date.
- Preview/seed mode: optimistic UI works; server actions are no-ops (consistent
  with the rest of the app).
- Milestones with a `seed-` id edit/delete only in the local view until a real
  DB row exists (same seed-guard behavior as events/tasks elsewhere).

## Verification

- Read-tool verification of all changed files (the workspace shell mount serves
  stale copies of edited files, so eslint there is unreliable for edits).
- `npm run lint` + `npm run build` to be run on the user's machine before commit.

## Not in scope
- Recurring milestones, reminders, drag-to-reschedule on the calendar grid.
