# Event Scheduler — Add / Edit / Remove + Google Calendar (ICS) Export

Branch: `develop`
Status: implemented in this pass

## Goal

Turn the read-only Event Scheduler into a fully editable calendar:

1. **Add / edit / remove events** directly from the scheduler.
2. **Export** the schedule as a standard `.ics` file that imports into
   **Google Calendar**, Apple Calendar, and Outlook.

## Current state (before this change)

- `app/(app)/scheduler/page.jsx` → server component, calls `getCalendarData()`.
- `components/calendar/CalendarView.jsx` → **read-only** month grid + day
  detail + upcoming list. Renders `events` (from the `events` table) and task
  milestones. No mutation, no export beyond the PDF runsheet.
- `lib/data.js#getCalendarData()` → fetches events (Supabase) with a seed
  fallback (`preview: true`).
- The `events` table already has every field we need
  (`name_en/vi/zh`, `event_date`, `start_time`, `end_time`, `location`,
  `event_type`, `dress_code`, `is_halal`, `notes`, `wedding_id`). **No schema
  migration required.**

## Conventions being reused

- **Mutations**: server actions in `app/(app)/<feature>/actions.js` with
  `"use server"`, `createClient()`, `weddingIdByCode()` to map scope→wedding,
  the `isSeed()` guard, and `revalidatePath()`. Returns `{ ok, preview, id }`.
  (Mirrors `budget/actions.js`.)
- **Optimistic UI**: `useState(initial)` list in the client view; on save/delete
  update local state immediately, then fire the server action `.catch(() => {})`.
  In preview/seed mode the action is a no-op but the UI still updates.
  (Mirrors `GuestsView.jsx`.)
- **Modal form**: `components/ui/Modal.jsx` + `.input` / `.label` CSS utilities.
- **Downloads**: `lib/export.js#triggerDownload` (Blob → `<a download>`).

## Changes

### New files
- `lib/ics.js` — pure iCalendar (RFC 5545) builder.
  - One `VEVENT` per event: `UID`, `DTSTAMP`, `SUMMARY`, `LOCATION`,
    `DESCRIPTION` (type · dress code · halal · notes), `DTSTART`/`DTEND`.
  - Timed events use `TZID` (`HP → Asia/Ho_Chi_Minh` +07,
    `KK → Asia/Kuching` +08; shared defaults to Ho_Chi_Minh). Minimal
    `VTIMEZONE` blocks emitted for the zones actually used.
  - Events with no start time become **all-day** (`VALUE=DATE`).
  - Correct text escaping (`, ; \ \n`), 75-octet line folding, `CRLF` endings.
- `app/(app)/scheduler/actions.js` — `saveEvent(input)` (insert/update) and
  `deleteEvent(id)`.
- `components/calendar/EventForm.jsx` — Modal add/edit form: name (EN + optional
  VI/ZH), date, start/end time, location, type, dress code, halal toggle, scope
  (HP / KK / shared), notes. Delete button in edit mode.

### Edited files
- `components/calendar/CalendarView.jsx`
  - "**+ Add event**" button (header) and an "**Export .ics**" button.
  - Local optimistic `events` state seeded from props.
  - Clicking an **event** (day detail or upcoming list) opens the edit form;
    task milestones stay read-only.
  - Empty selected day shows "Add event on this date".
  - Export builds an `.ics` from the currently in-scope events.
- `lib/data.js#getCalendarData()` — also select/return `dress_code` + `notes`
  so the form and ICS description are complete.
- `lib/export.js` — add `downloadICS(content, filename)` helper.
- `lib/i18n/{en,vi,zh}.js` — add `calendar.*` strings (add/edit/new event,
  export, field labels, delete confirm).

## Export UX

- Button downloads `wedding-schedule[-HP|-KK].ics` for the current scope.
- In Google Calendar: **Settings → Import & export → Import** the file.
- The file is a **static snapshot** — re-download after edits. (A live
  auto-syncing subscription feed via the existing share-token system is a
  possible follow-up; not in this pass.)

## Timezones

Hai Phong = UTC+7 (`Asia/Ho_Chi_Minh`), Kota Kinabalu = UTC+8 (`Asia/Kuching`);
neither observes DST, so `VTIMEZONE` blocks are single fixed-offset `STANDARD`
components. Emitting `TZID` keeps venue-local times correct regardless of the
importer's own timezone.

## Testing / verification

- Node script validates the generated ICS against RFC 5545 structural rules
  (BEGIN/END pairing, `CRLF`, folding, one `VEVENT` per event, valid `DTSTART`).
- `eslint` on all changed files.
- `next build` cannot run in the sandbox (Windows-only SWC, no network); build
  verification is left to the user's machine / CI.

## Not in scope (possible follow-ups)

- Live subscription (`webcal`) feed with auto-sync.
- Direct Google Calendar OAuth push.
- Recurring events, reminders/alarms, per-guest filtered exports.
- Editing task milestones from the calendar.
