# Two Weddings — Cross-Cultural Wedding Planner

A bespoke, couple-owned planning app for **two destination weddings** held in close succession in **October 2027**, with shareable read-only views for planners, families, the bridal party, guests, and vendors.

- 🇻🇳 **Hải Phòng, Vietnam** — Lễ Dạm Ngõ · Lễ Ăn Hỏi · Lễ Cưới (8–10 Oct 2027)
- 🇲🇾 **Kota Kinabalu, Malaysia** — Chinese tea ceremony & banquet · Halal-friendly lunch (16–17 Oct 2027)

Trilingual (**English / Tiếng Việt / 中文**), multi-role, and multi-currency: budgets are tracked in **VND** and **MYR** with a combined **AUD** rollup.

> **Status:** All 13 modules are fully built (Phases 1–5 complete) plus a fully interactive Event Scheduler with calendar CRUD, ICS export, recurring milestones, in-app reminders, and drag-to-reschedule. The app runs live on Supabase or in a zero-config **preview mode** on local seed data.

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
- [Roles & access control](#roles--access-control)
- [Sharing, export & communications](#sharing-export--communications)
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

With no environment variables set, the app boots straight into **preview mode** — sign-in is bypassed and every screen renders local seed data (two weddings, five events, sample guests, budget, vendors, and tasks), clearly badged as preview. Add Supabase keys to go live.

Requires **Node.js 20.9+** (Next.js 16 / React 19).

---

## Preview mode vs. live mode

The app degrades gracefully at every layer, so it is always runnable.

| Capability | Preview mode (no keys) | Live mode (Supabase configured) |
| --- | --- | --- |
| Data source | In-memory seed data (`lib/seed-data.js`) | Postgres via Supabase |
| Auth | Bypassed (no login) | Magic-link (email OTP) sign-in |
| Writes (add/edit/delete) | Held in local component state only | Persisted to Postgres |
| Share links | Self-encoding `p_…` tokens (resolve with no DB) | Real tokens stored in `shares` (revoke/expiry enforced) |
| Live FX | Static fallback rates | Live rates when `EXCHANGE_RATE_API_KEY` is set |
| Email (digest/reminders/RSVP) | No-op | Sent via Resend when configured |

Preview mode is detected in `lib/supabase/config.js` — real credentials **and** a well-formed project URL are required, otherwise the app falls back to preview instead of crashing.

---

## Feature catalog

Thirteen modules, grouped into five sections (see `lib/modules.js`, the single source of truth for navigation and routing).

### Plan
- **Dashboard** (`/dashboard`) — live dual countdowns, RSVP donut, budget bars, task checklist, and a wedding-scope switcher (Both / VN / MY) with a combined-AUD rollup when viewing both.
- **Event Scheduler** (`/scheduler`) — month calendar marking all ceremonies and task milestones. Full event CRUD via an inline form; **ICS export** (RFC 5545, timezone-anchored to each venue) for Google/Apple/Outlook; **recurring** task milestones (daily/weekly/monthly with an optional end date); **in-app reminders** with configurable lead time; and **drag-to-reschedule** for events and one-off tasks.
- **Planning Board** (`/planning`) — To do / In progress / Done Kanban with native drag-and-drop and a status-select fallback.

### People
- **Guest Management** (`/guests`) — full CRUD, search and side/status filters, scope-aware, dietary tags, plus-one, and per-event invite + RSVP managed inline.
- **RSVP Tracking** (`/rsvp`) — in-app admin: per-event response summary cards and an editable guest × event status matrix. Generates the public RSVP link.
- **Table Planner** (`/tables`) — per-wedding tables with drag-and-drop seat assignment, capacity badges, and an unassigned pool (one table per wedding enforced).
- **Vendors** (`/vendors`) — contacts, contract status, payment schedule (total / deposit / balance), Halal-certified flag, and status/category filters.

### Money
- **Budget Tracker** (`/budget`) — per-category planned amounts with nested actual expense line items, planned-vs-actual bars, add/edit/delete, and an AUD rollup.
- **Combined Finance** (`/finance`) — AUD stat cards, Recharts budget-vs-actual by wedding and by category, and a per-wedding local + AUD breakdown table. Uses live FX with a static fallback (live/static badge shown).

### Culture
- **Mood Boards** (`/moodboards`) — image-URL cards grouped by board, a colour-swatch picker (presets + custom hex), and notes.
- **Attire** (`/attire`) — outfit cards grouped by role, confirmed/inspiration status, image URL, and notes.
- **Traditions** (`/traditions`) — trilingual authored guide to the Vietnamese ceremonies and the Chinese tea ceremony. Static content.

### Admin
- **Settings & Access** (`/settings`) — owner-gated member and invitation management, plus a role-access reference.

### Public (no login)
- **Read-only share** (`/share/[token]`) — token-gated view of guests, vendors, or schedule, with optional email-OTP gate. States: ok / expired / revoked / invalid.
- **Public RSVP form** (`/rsvp-form/[token]`) — token-gated writable form; find-or-create guest by email and upsert their per-event responses.

### API routes
- `/api/pdf/[kind]` — on-demand PDF (run sheet, budget) via `@react-pdf/renderer`.
- `/api/digest` — monthly RSVP digest email (cron-protected).
- `/api/reminders` — weekly task-reminder email (cron-protected).
- `/auth/callback` — magic-link exchange + invite linking.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) · **React 19** |
| Language | JavaScript (`.jsx` / `.js`) — no TypeScript |
| Styling | **Tailwind CSS v3** with dual wedding themes (HP red/gold · KK teal/gold) |
| Charts | **Recharts** |
| Backend | **Supabase** — Postgres + Auth + Row Level Security |
| Auth | Supabase magic-link (email OTP), middleware session refresh |
| i18n | Lightweight in-repo dictionaries (EN / VI / ZH), no `next-intl` |
| PDF | `@react-pdf/renderer` (lazy-loaded, server route) |
| Email | `resend` (monthly digest, weekly reminders, RSVP confirm/notify) |
| Spreadsheet export | SheetJS via CDN (`cdn.sheetjs.com` 0.20.3 — not npm, due to CVE-2023-30533) |
| QR codes | `node-qrcode` via CDN |
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
  login/page.jsx             Magic-link sign-in
  auth/callback/route.js     Magic-link exchange + invite linking
  (app)/                     Authenticated shell (sidebar + topbar + route guard)
    dashboard | scheduler | planning | guests | rsvp | tables |
    vendors | budget | finance | moodboards | attire | traditions | settings
    <module>/page.jsx        Server component (data fetch)
    <module>/actions.js      Server actions (CRUD) — 9 modules
  share/[token]/page.jsx     Public read-only share (no auth)
  rsvp-form/[token]/page.jsx Public writable RSVP form (no auth)
  api/
    pdf/[kind]/route.js      PDF generation
    digest/route.js          Monthly RSVP digest (cron)
    reminders/route.js       Weekly task reminders (cron)
components/
  ui/                        Button, Card, Badge, Modal, Placeholder
  layout/                    Sidebar, Topbar, AppShell (role-filtered nav + access guard)
  dashboard/                 Countdown, StatCard, RsvpDonut, BudgetBars, DashboardView
  calendar/                  CalendarView, EventForm
  planning/                  PlanningView, TaskForm
  <module>/                  BudgetView, VendorsView, GuestsView, FinanceView,
                             TablesView, MoodboardsView, AttireView, RsvpView,
                             TraditionsView, SettingsView, PublicRsvpForm
  share/                     ShareButton, ShareLayout, Share{Guest,Vendor}List,
                             ShareSchedule, ExportButton, OtpGate, QrCode
  pwa/                       ServiceWorkerRegister
context/
  AppContext.jsx             Client context: locale, wedding scope, translator
lib/
  modules.js                 13-module nav/route config
  data.js                    Server data access (Supabase → seed fallback)
  seed-data.js               Preview seed data
  dashboard.js               Pure, scope-aware aggregation
  i18n/                      en.js / vi.js / zh.js + index.js translator
  supabase/                  client, server, admin (service role), middleware, config
  auth/roles.js              Roles + per-module access map
  ics.js                     RFC 5545 iCalendar builder (pure, dependency-free)
  recurrence.js              Recurring-milestone + reminder-window math (pure)
  fx.js                      Live FX fetch + 6h cache (server-only)
  format.js / theme.js       Currency/FX helpers + wedding theme tokens
  export.js                  XLSX (SheetJS CDN) + CSV + ICS download helpers
  share.js / share-data.js / share-actions.js   Token design + resolution + CRUD
  otp-actions.js             Email-OTP gate for share links
  rsvp-actions.js            Public RSVP submission (service role)
  pdf/documents.jsx          Run sheet + budget PDF documents
  digest.js / reminders.js / email.js   Email jobs + Resend transport
  qr.js / traditions.js
supabase/
  schema.sql                 Tables, RLS, owner-bootstrap trigger, invite acceptance
  seed.sql                   Weddings, events, guests, budget, vendors, tasks
  SETUP.md                   Supabase setup notes
public/
  icon.svg / icon-maskable.svg / sw.js
```

---

## Environment variables

Copy `.env.local.example` → `.env.local` and fill in. Everything except the first two is optional; each unset key degrades gracefully.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For live mode | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For live mode | Public anon key (browser client) |
| `SUPABASE_SERVICE_ROLE_KEY` | For sharing/RSVP | Server-only; used by public share + RSVP routes to bypass RLS |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Base URL for magic-link redirects |
| `EXCHANGE_RATE_API_KEY` | Optional | Live VND/MYR→AUD rates on the Finance page |
| `RESEND_API_KEY` | Optional | Email transport (digest, reminders, RSVP confirm/notify) |
| `RESEND_FROM` | Optional | From address, e.g. `Two Weddings <noreply@yourdomain.com>` |
| `DIGEST_RECIPIENTS` | Optional | Comma-separated couple/planner recipients |
| `CRON_SECRET` | Optional | Protects `/api/digest` and `/api/reminders` |

> `.env.local` and all `.env*.local` files are git-ignored. Keep `.env.local.example` as empty placeholders only.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run **`supabase/schema.sql`**, then **`supabase/seed.sql`**. `schema.sql` is idempotent and safe to re-run after updates.
3. Copy `.env.local.example` → `.env.local` and fill in from **Project Settings → API**.
4. In **Authentication → URL Configuration**, set the Site URL to your app URL and add `<site>/auth/callback` as a redirect URL.
5. Restart `npm run dev`. The **first** person to sign in becomes the **owner**; everyone else joins via invitations (Settings module).

> For a private app, disable open sign-ups in **Authentication → Providers → Email** and rely on invited emails.

---

## Data model

Sixteen tables, all with Row Level Security enabled (`supabase/schema.sql`):

`members`, `invites`, `weddings`, `events`, `guests`, `guest_events`, `vendors`, `budget_categories`, `budget_items`, `tasks`, `seating_tables`, `seating_assignments`, `moodboard_items`, `attire_items`, `shares`, `share_otps`.

Notable design points:

- **Weddings** are keyed by `code` (`HP` / `KK`); a `null` `wedding_id` on events, tasks, and mood boards means the row is **shared** across both weddings.
- **Budget** splits planned from actual: one planned amount per `budget_categories(wedding, category)`, with many actual line items in `budget_items`. `lib/data.js` merges them for the dashboard.
- **Tasks** carry `recur_freq`, `recur_until`, and `remind_days_before` to power recurring milestones and in-app reminders.
- **RSVP** is per-event via `guest_events` (a guest can be invited to many events across both weddings).
- **Shares** hold token, resource, scope, optional expiry/revocation, and an `otp_required` flag; `share_otps` stores one-time email codes.

---

## Roles & access control

Six roles (`lib/auth/roles.js`): **owner**, **planner**, **family**, **party**, **guest**, **vendor**.

- The **owner** (first sign-in) sees everything and manages members/invites.
- Each other role has a curated module allow-list that filters the sidebar and enforces a direct-URL guard in `AppShell`.
- Roles are assigned **server-side** on invite acceptance (`accept_invite()`), so a user can never choose their own role.

See [Security notes](#security-notes) for the RLS caveat on role granularity.

---

## Sharing, export & communications

- **Token-gated read-only links** for guests, vendors, or schedule — the primary way non-technical stakeholders view data without an account. Copy, WhatsApp (`wa.me`), Web Share API, and QR code included. Optional email-OTP gate.
- **Public RSVP form** — a writable, token-gated link the couple generates from the RSVP admin page.
- **Export** — XLSX (SheetJS via CDN) and CSV (with BOM) for guests/vendors/budget; ICS for the schedule; PDF run sheet (Calendar) and budget (Finance).
- **Email** (Resend) — monthly RSVP digest, weekly task reminders, and per-submission RSVP confirmation (to guest) + alert (to couple).

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
2. Add the environment variables above (including `CRON_SECRET` to enable crons).
3. Deploy. `vercel.json` registers the digest and reminder crons automatically.
4. Point your Supabase Auth redirect URLs at the deployed domain and set `NEXT_PUBLIC_SITE_URL` accordingly.

Branch workflow: `main` is stable/production, `develop` is the integration branch; feature branches merge into `develop`, which is promoted to `main` via PR (Vercel preview + Supabase preview checks run on PRs).

See `LAUNCH.md` for the full pre-launch checklist, UAT script, and rollback plan, and `EMAIL.md` for Resend domain verification (SPF/DKIM/DMARC) and inbox testing.

---

## Security notes

- **RLS everywhere** — all 16 tables have Row Level Security enabled.
- **Security-definer helpers** (`is_member()`, `is_owner()`) pin `search_path = public` to prevent search-path hijacking.
- **Server-side role assignment** — `accept_invite()` runs as `SECURITY DEFINER` with execute revoked from `public` and granted only to `authenticated`; users cannot self-assign a role.
- **Service-role client** (`lib/supabase/admin.js`) is `server-only`, returns `null` when unconfigured, and is used solely by the public share and RSVP routes.
- **One-time codes** (`share_otps`) have RLS enabled with **no policies**, locking the table to the service role.
- **Secret hygiene** — `.env*.local` is git-ignored; only `.env.local.example` (empty placeholders) is tracked. A repo-wide secret scan finds no committed keys.

---

## Known limitations

- **Role granularity is enforced in the app layer, not by RLS.** At the database level, every authenticated **member** can read/write all planning tables (`is_member()`); the per-role restrictions (family / party / guest / vendor) are applied by sidebar filtering and the `AppShell` route guard. Finer per-role RLS is a deferred hardening step — relevant if you expose the API directly or invite lower-trust roles.
- **Emails/PDF depend on optional keys.** Without `RESEND_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, digest, reminders, RSVP notifications, and the OTP gate no-op.
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
