# Two Weddings — Wedding Planner

Phase 1 foundation for a cross-cultural planner covering two destination weddings:

- 🇻🇳 **Hải Phòng, Vietnam** — Lễ Dạm Ngõ · Lễ Ăn Hỏi · Lễ Cưới (8–10 Oct 2027)
- 🇲🇾 **Kota Kinabalu, Malaysia** — Tea ceremony & banquet · Halal-friendly lunch (16–17 Oct 2027)

Trilingual (EN / VI / 中文), multi-role, multi-currency (VND + MYR with a combined **AUD** rollup).

This is a **fresh, production-oriented build** (separate from the earlier demo) following the product plan's Phase 1 — Foundation scope.

## What Phase 1 delivers

| Plan item | Status |
| --- | --- |
| Project repo, hosting-ready, database schema | ✅ Next.js 14 App Router + `supabase/schema.sql` |
| Authentication (couple = owner, invite-based roles) | ✅ Supabase magic-link auth, route-protecting middleware, 6 roles |
| Core data models (weddings, events, guests, vendors) | ✅ Postgres schema + RLS + seed data |
| Design system (typography, colour tokens, components) | ✅ Dual themes (HP red/gold · KK teal/gold), UI kit |
| Dashboard shell + navigation | ✅ Sidebar (13 modules, role-filtered) + topbar with dual countdowns |
| Language toggle infrastructure (EN / VI / 中文) | ✅ Lightweight dictionary + context toggle |

The other 12 modules appear as role-aware placeholders tagged with their build phase.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Without Supabase keys the app runs in **preview mode**: sign-in is bypassed, and the
dashboard renders local seed data (clearly badged). Add keys to go live.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run **`supabase/schema.sql`**, then **`supabase/seed.sql`**.
3. Copy `.env.local.example` → `.env.local` and fill in from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by token share routes in Phase 2)
4. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000`
   and add `http://localhost:3000/auth/callback` as a redirect URL.
5. Restart `npm run dev`. The **first** person to sign in becomes the **owner**;
   everyone else joins via invitations (Settings module, Phase 4).

> For a private app, disable open sign-ups in **Authentication → Providers → Email**
> and rely on invited emails.

## Project structure

```
app/
  layout.jsx              Root layout + AppProvider (language / scope)
  page.jsx                Redirects to /dashboard
  login/page.jsx          Magic-link sign-in
  auth/callback/route.js  Magic-link exchange + invite linking
  (app)/
    layout.jsx            Protected shell (sidebar + topbar)
    dashboard/page.jsx    Live dashboard
    <module>/page.jsx     12 phase-tagged placeholders
components/
  ui/                     Button, Card, Badge, Placeholder
  layout/                 Sidebar, Topbar, AppShell
  dashboard/              Countdown, StatCard, RsvpDonut, BudgetBars, DashboardView
context/AppContext.jsx    Client context: locale, wedding scope, translator
lib/
  i18n/                   EN / VI / ZH dictionaries + translator
  supabase/               Browser + server clients, middleware session refresh
  auth/roles.js           Roles + per-module access map
  data.js                 Server data access (Supabase → seed fallback)
  dashboard.js            Pure aggregation (scope-aware)
  modules.js              13-module nav config
  theme.js / format.js    Wedding tokens + currency/FX helpers
supabase/
  schema.sql              Tables, RLS, owner-bootstrap trigger
  seed.sql                Weddings, events, sample guests/budget/tasks
```

## Stack

Next.js 14 (App Router) · React 18 · Tailwind CSS · Supabase (Postgres + Auth) · Recharts.
Matches the product plan's recommended stack. Currency conversion uses static fallback
rates in `lib/format.js` (Phase 3 swaps in a live Open Exchange Rates fetch).

## Next: Phase 2

Guest management, public RSVP forms, budget tracker, vendor management, planning board,
and the token-gated sharing MVP — per the roadmap.
