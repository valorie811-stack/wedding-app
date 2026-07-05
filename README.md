# Two Weddings — Cross-Cultural Wedding Planner

A bespoke, **single-owner** planning app for **two destination weddings** held in close succession in **October 2027**. It is used only by the couple (bride & groom), who unlock it with a **shared PIN**.

- 🇻🇳 **Hải Phòng, Vietnam** — Lễ Dạm Ngõ · Lễ Ăn Hỏi · Lễ Cưới (8–10 Oct 2027)
- 🇲🇾 **Kota Kinabalu, Malaysia** — Chinese tea ceremony & banquet · Halal-friendly lunch (16–17 Oct 2027)

Trilingual (**English / Tiếng Việt / 中文**) and multi-currency: budgets are tracked in **VND** and **MYR** with a combined **AUD** rollup.

> **Status:** All 13 modules are fully built plus a fully interactive Event Scheduler with calendar CRUD, ICS export, recurring milestones, in-app reminders, and drag-to-reschedule. The app runs live on Supabase or in a zero-config **preview mode** on local seed data. Data lives in one Supabase project shared by both partners; there are no accounts, roles, or share links — just the PIN and static exports.

---

## Table of contents

- [Quick start](#quick-start)
- [Preview mode vs. live mode](#preview-mode-vs-live-mode)
- [Feature catalog](#feature-catalog)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Data model](#data-model)
- [Access & the PIN](#access--the-pin)
- [Export & communications](#export--communications)
- [Scheduled jobs (cron)](#scheduled-jobs-cron)
- [PWA](#pwa)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Further docs](#further-docs)

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables set, the app boots straight into **preview mode** — the PIN gate is bypassed and every screen renders local seed data (two weddings, five events, sample guests, budget, vendors, and tasks), clearly badged as preview. Add Supabase keys to go live.

Requires **Node.js 20.9+** (Next.js 16 / React 19).

---

## Preview mode vs. live mode

The app degrades gracefully at every layer, so it is always runnable.

| Capability | Preview mode (no keys) | Live mode (Supabase configured) |
| --- | --- | --- |
| Data source | In-memory seed data (`lib/seed-data.js`) | Postgres via Supabase (service-role, server-side) |
| Unlock | Gate bypassed (or `APP_PIN` if set) | Shared PIN stored in `app_settings` |
| Writes (add/edit/delete) | Held in local component state only | Persisted to Postgres |
| Live FX | Static fallback rates | Live rates when `EXCHANGE_RATE_API_KEY` is set |
| Email (digest/reminders) | No-op | Sent via Resend when configured |

Preview mode is detected in `lib/supabase/config.js` — real credentials **and** a well-formed project URL are required, otherwise the app falls back to preview instead of crashing.

---

## Feature catalog

Thirteen modules, grouped into five sections (see `lib/modules.js`, the single source of truth for navigation and routing).

### Plan
- **Dashboard** (`/dashboard`) — live dual countdowns, RSVP donut, budget bars, task checklist, and a wedding-scope switcher (Both / VN / MY) with a combined-AUD rollup when viewing both.
- **Event Scheduler** (`/scheduler`) — month calendar marking all ceremonies and task milestones. Full event CRUD via an inline form; **ICS export** (RFC 5545, timezone-anchored to each venue) for Google/Apple/Outlook; **recurring** task milestones (daily/weekly/monthly with an optional end date); **in-app reminders** with configurable lead time; and **drag-to-reschedule** for events and one-off tasks.
- **Planning Board** (`/planning`) — To do / In progress / Done Kanban with native drag-and-drop and a status-select fallback.

### People
- **Guest Management** (`/guests`) — full CRUD, search and side/status filters, scope-aware, dietary tags, plus-one, and per-event invite + RSVP managed inline. Export to Excel/CSV.
- **RSVP Tracking** (`/rsvp`) — in-app admin: per-event response summary cards and an editable guest × event status matrix. The couple records responses themselves.
- **Table Planner** (`/tables`) — per-wedding tables with drag-and-drop seat assignment, capacity badges, and an unassigned pool (one table per wedding enforced).
- **Vendors** (`/vendors`) — contacts, contract status, payment schedule (total / deposit / balance), Halal-certified flag, and status/category filters. Export to Excel/CSV.

### Money
- **Budget Tracker** (`/budget`) — per-category planned amounts with nested actual expense line items, planned-vs-actual bars, add/edit/delete, an AUD rollup, and Excel/CSV export.
- **Combined Finance** (`/finance`) — AUD stat cards, Recharts budget-vs-actual by wedding and by category, and a per-wedding local + AUD breakdown table. Uses live FX with a static fallback (live/static badge shown). PDF budget export.

### Culture
- **Mood Boards** (`/moodboards`) — image-URL cards grouped by board, a colour-swatch picker (presets + custom hex), and notes.
- **Attire** (`/attire`) — outfit cards grouped by role, confirmed/inspiration status, image URL, and notes.
- **Traditions** (`/traditions`) — trilingual authored guide to the Vietnamese ceremonies and the Chinese tea ceremony. Static content.

### Admin
- **Settings** (`/settings`) — change the shared PIN and sign out.

### Auth
- **Lock screen** (`/login`) — PIN setup on first run, then PIN unlock. No email, no accounts.

### API routes
- `/api/pdf/[kind]` — on-demand PDF (run sheet, budget) via `@react-pdf/renderer`.
- `/api/digest` — monthly RSVP digest email to the couple (cron-protected).
- `/api/reminders` — weekly task-reminder email to the couple (cron-protected).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) · **React 19** |
| Language | JavaScript (`.jsx` / `.js`) — no TypeScript |
| Styling | **Tailwind CSS v3** with dual wedding themes (HP red/gold · KK teal/gold) |
| Charts | **Recharts** |
| Backend | **Supabase** — Postgres accessed server-side with the service-role key |
| Auth | Single shared **PIN** (scrypt-hashed in `app_settings`) → signed httpOnly session cookie; guarded in `proxy.js` |
| i18n | Lightweight in-repo dictionaries (EN / VI / ZH), no `next-intl` |
| PDF | `@react-pdf/renderer` (lazy-loaded, server route) |
| Email | `resend` (monthly digest, weekly reminders) |
| Spreadsheet export | SheetJS via CDN (`cdn.sheetjs.com` 0.20.3 — not npm, due to CVE-2023-30533) |
| FX | `exchangerate-api.com` v6 (live) with static fallback |
| PWA | Web manifest + service worker (network-first, offline fallback) |

---

## Project structure

```
app/
  layout.jsx                 Root layout, AppProvider, service-worker register, manifest metadata
  page.jsx                   Redirect to /dashboard
  manifest.js                PWA manifest
  offline/page.jsx           Offline fallback
  login/page.jsx             Lock screen (PIN setup / unlock)
  login/actions.js           PIN verify / setup / sign-out server actions
  (app)/                     App shell (sidebar + topbar), gated by the PIN session
    dashboard | scheduler | planning | guests | rsvp | tables |
    vendors | budget | finance | moodboards | attire | traditions | settings
    <module>/page.jsx        Server component (data fetch)
    <module>/actions.js      Server actions (CRUD)
  api/
    pdf/[kind]/route.js      PDF generation
    digest/route.js          Monthly RSVP digest (cron)
    reminders/route.js       Weekly task reminders (cron)
components/
  ui/                        Button, Card, Badge, Modal, Placeholder
  auth/                      PinForm (lock screen form)
  layout/                    Sidebar, Topbar, AppShell
  dashboard/                 Countdown, StatCard, RsvpDonut, BudgetBars, DashboardView
  calendar/                  CalendarView, EventForm
  planning/                  PlanningView, TaskForm
  <module>/                  BudgetView, VendorsView, GuestsView, FinanceView,
                             TablesView, MoodboardsView, AttireView, RsvpView,
                             TraditionsView, SettingsView
  share/                     ExportButton (Excel/CSV static export)
  pwa/                       ServiceWorkerRegister
context/
  AppContext.jsx             Client context: locale, wedding scope, translator
lib/
  modules.js                 13-module nav/route config
  data.js                    Server data access (Supabase → seed fallback)
  seed-data.js               Preview seed data
  dashboard.js               Pure, scope-aware aggregation
  i18n/                      en.js / vi.js / zh.js + index.js translator
  auth/pin.js                PIN hashing + app_settings storage (server-only)
  auth/session.js            Signed session cookie (Web Crypto, Edge-safe)
  supabase/                  client, server (service role), admin, middleware, config
  ics.js                     RFC 5545 iCalendar builder (pure, dependency-free)
  recurrence.js              Recurring-milestone + reminder-window math (pure)
  fx.js                      Live FX fetch + 6h cache (server-only)
  format.js / theme.js       Currency/FX helpers + wedding theme tokens
  export.js                  XLSX (SheetJS CDN) + CSV + ICS download helpers
  pdf/documents.jsx          Run sheet + budget PDF documents
  digest.js / reminders.js / email.js   Email jobs + Resend transport
  traditions.js
proxy.js                     Next 16 middleware — PIN-session route guard
supabase/
  schema.sql                 Tables, app_settings (PIN), RLS locked to service role
  seed.sql                   Weddings, events, guests, budget, vendors, tasks
  SETUP.md                   Supabase setup notes
public/
  icon.svg / icon-maskable.svg / sw.js
```

---

## Environment variables

Copy `.env.local.example` → `.env.local` and fill in.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For live mode | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For live mode | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **For live data + PIN** | Server-only; all DB access uses it (bypasses RLS) and it stores the PIN |
| `APP_SESSION_SECRET` | **In production** | Secret that signs the PIN session cookie (`openssl rand -hex 32`) |
| `APP_PIN` | Optional | Preview/demo PIN when Supabase is not connected |
| `EXCHANGE_RATE_API_KEY` | Optional | Live VND/MYR→AUD rates on the Finance page |
| `RESEND_API_KEY` | Optional | Email transport (digest, reminders) |
| `RESEND_FROM` | Optional | From address, e.g. `Two Weddings <noreply@yourdomain.com>` |
| `DIGEST_RECIPIENTS` | Optional | Comma-separated recipients (bride + groom) |
| `CRON_SECRET` | Optional | Protects `/api/digest` and `/api/reminders` |

> `.env.local` and all `.env*.local` files are git-ignored. Keep `.env.local.example` as empty placeholders only.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run **`supabase/schema.sql`**, then **`supabase/seed.sql`**. `schema.sql` is idempotent and safe to re-run after updates — it also drops the old members/invites/shares tables if present.
3. Copy `.env.local.example` → `.env.local` and fill in from **Project Settings → API**. Set `SUPABASE_SERVICE_ROLE_KEY` (required for live data) and a strong `APP_SESSION_SECRET`.
4. Restart `npm run dev` and open the app. On first run you'll be prompted to **set a PIN**; after that you unlock with it. Both partners use the same PIN. Change it later in **Settings**.

> No Supabase Auth configuration is needed — the app does not create Supabase Auth users. Access is entirely via the PIN.

---

## Data model

Thirteen tables, all with Row Level Security enabled and **no policies** (locked to the service role) — see `supabase/schema.sql`:

`app_settings`, `weddings`, `events`, `guests`, `guest_events`, `vendors`, `budget_categories`, `budget_items`, `tasks`, `seating_tables`, `seating_assignments`, `moodboard_items`, `attire_items`.

Notable design points:

- **`app_settings`** is a single row holding the scrypt-hashed PIN + salt. Only the server (service role) ever reads or writes it.
- **Weddings** are keyed by `code` (`HP` / `KK`); a `null` `wedding_id` on events, tasks, and mood boards means the row is **shared** across both weddings.
- **Budget** splits planned from actual: one planned amount per `budget_categories(wedding, category)`, with many actual line items in `budget_items`. `lib/data.js` merges them for the dashboard.
- **Tasks** carry `recur_freq`, `recur_until`, and `remind_days_before` to power recurring milestones and in-app reminders.
- **RSVP** is per-event via `guest_events` (a guest can be invited to many events across both weddings). The couple records responses in the RSVP module.

---

## Access & the PIN

The app is single-owner: the bride and groom share one account, unlocked by a PIN.

- **First run** — no PIN is set, so the lock screen shows a **setup** form. The couple chooses a 4–8 digit PIN; it's scrypt-hashed with a random salt and stored in `app_settings`.
- **Unlock** — entering the PIN verifies it server-side and issues a signed, httpOnly session cookie (30-day expiry, HMAC-SHA256 over `APP_SESSION_SECRET`). The `proxy.js` middleware checks this cookie on every protected route.
- **Change PIN / sign out** — in **Settings**. Changing the PIN requires the current one.
- **Preview** — with no Supabase, the gate is bypassed unless you set `APP_PIN`, which the lock screen then compares directly.

There are no roles, members, invitations, or per-user permissions. Every screen is visible to whoever holds the PIN.

---

## Export & communications

- **Static exports** — XLSX (SheetJS via CDN) and CSV (with BOM) for guests / vendors / budget; ICS for the schedule; PDF run sheet (Calendar) and budget (Finance). These are the only ways data leaves the app — download a file and share it however you like.
- **Email** (Resend, optional) — monthly RSVP digest and weekly task reminders sent to the couple (`DIGEST_RECIPIENTS`). No-ops when Resend is unconfigured.

---

## Scheduled jobs (cron)

Configured in `vercel.json`; both endpoints are protected by `CRON_SECRET`.

| Endpoint | Schedule | Job |
| --- | --- | --- |
| `/api/digest` | `0 9 1 * *` (09:00, 1st of month) | Monthly RSVP digest email |
| `/api/reminders` | `0 9 * * 1` (09:00, Mondays) | Weekly task reminders email |

---

## PWA

Installable as a Progressive Web App: `app/manifest.js`, maskable icons in `public/`, and a network-first service worker (`public/sw.js`) with an `/offline` fallback. Icons are SVG — add PNG variants for full install criteria on all platforms.

---

## Scripts

```bash
npm run dev      # start the dev server (http://localhost:3000)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next)
```

---

## Deployment

Optimized for **Vercel**:

1. Import the repo into Vercel.
2. Add the environment variables above — at minimum the two Supabase keys, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_SESSION_SECRET` (plus `CRON_SECRET` to enable crons).
3. Deploy. `vercel.json` registers the digest and reminder crons automatically.
4. Open the deployed URL and set your PIN on first run.

Branch workflow: `main` is stable/production, `develop` is the integration branch; feature branches merge into `develop`, which is promoted to `main` via PR (Vercel preview + Supabase preview checks run on PRs).

See `LAUNCH.md` for the full pre-launch checklist, UAT script, and rollback plan, and `EMAIL.md` for Resend domain verification (SPF/DKIM/DMARC) and inbox testing.

---

## Security notes

- **RLS locked to the service role** — every table has Row Level Security enabled with **no policies**. Only the server's service-role client can read/write; the anon/authenticated roles have no access.
- **PIN is hashed** — stored as a scrypt hash + random salt in `app_settings`, compared with `timingSafeEqual`. The plaintext PIN is never persisted.
- **Signed sessions** — the unlock cookie is httpOnly, `SameSite=Lax`, `Secure` in production, and HMAC-signed with `APP_SESSION_SECRET`. Set a strong secret; the built-in fallback is for local dev only and logs a warning.
- **Service-role key is server-only** — used exclusively in server components, server actions, and cron routes. It is never shipped to the browser.
- **Secret hygiene** — `.env*.local` is git-ignored; only `.env.local.example` (empty placeholders) is tracked.

---

## Known limitations

- **One shared PIN, no per-user identity.** Anyone with the PIN has full access; there is no audit trail of which partner made a change. This is by design for a two-person tool.
- **Live data requires the service-role key.** Without `SUPABASE_SERVICE_ROLE_KEY`, the app can't read/write Postgres or store a PIN and falls back to seed/preview.
- **Emails/PDF depend on optional keys.** Without `RESEND_API_KEY`, the digest and reminders no-op.
- **PWA icons are SVG only** — add PNGs for full installability on all platforms.
- **Traditions and PDFs are English-centric** — PDF fonts (Helvetica) lack VI/ZH glyphs; register a Unicode font before generating localized PDFs.
- **Build must be verified on your machine** — the CI/dev sandbox cannot run `next build` (platform-specific SWC binary).

---

## Further docs

| File | Contents |
| --- | --- |
| `LAUNCH.md` | Pre-launch checklist, live smoke test, UAT script, load-test plan, go-live + rollback |
| `EMAIL.md` | Resend domain verification, SPF/DKIM/DMARC, inbox test matrix, troubleshooting |
| `GIT_SETUP.md` | Git remote + branch setup |
| `supabase/SETUP.md` | Supabase project setup notes |
| `docs/plans/` | Design notes for the scheduler CRUD/ICS, milestone editing, and recurrence/reminders/drag features |
