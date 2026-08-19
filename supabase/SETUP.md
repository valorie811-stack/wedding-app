# Supabase setup — ~5 minutes

Do these once to take the app from preview mode to live data + sign-in.

## 1. Create the project
1. Go to https://supabase.com and sign in (GitHub or email).
2. **New project** → name it `two-weddings` → set a **database password** (save it) →
   pick a region close to you (e.g. *Southeast Asia (Singapore)*) → **Create**.
3. Wait ~2 min for it to provision.

## 2. Create the tables
1. Left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, paste the whole file, click **Run**.
   You should see "Success. No rows returned."
3. New query again → paste `supabase/seed.sql` → **Run**. (Adds the 2 weddings,
   5 ceremonies, and sample guests/budget/tasks.)

## 3. Get your keys
1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
3. In the project folder, copy `.env.local.example` to `.env.local` and paste the values in.
   Leave `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## 4. Set the session secret
This app is a **single-owner PIN gate** — there is no Supabase Auth sign-in, no
magic links, and no `/auth/callback` redirect to configure. The PIN hash is
stored in the `app_settings` table and the session cookie is signed locally.

In `.env.local` set:
```
APP_SESSION_SECRET=<paste `openssl rand -hex 32`>
```

## 5. Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000 → you'll be asked to **create a PIN** (4–8 digits) on
first run. That PIN is shared by both of you and unlocks the app from then on.

## Troubleshooting
- *Still says "Preview data — connect Supabase to save changes"* → the app could
  not read from the database. In order of likelihood:
  1. **`SUPABASE_SERVICE_ROLE_KEY` is missing.** Every table has RLS enabled
     with **no policies**, so the anon key reads *zero rows without raising an
     error*. The app needs the service-role key. This is the one that bites,
     because the URL + anon key alone look correctly configured.
  2. Keys missing or typo'd in `.env.local`, or `npm run dev` wasn't restarted
     after editing it.
  3. A query is failing — check the server console for a `[data] …: Supabase
     query failed` line, which names the module and the Postgres error.
- *A module is empty but not in preview mode* → that is correct behaviour: the
  connection is live and that table simply has no rows yet. Add a record, or run
  `seed.sql` (step 2.3) for samples.
- *Want to reset* → re-running `schema.sql` and `seed.sql` is safe (idempotent).

## Phase 2–4 additions
Re-run `supabase/schema.sql` (idempotent) after pulling new phases — it now also
creates: `shares` + `share_otps` (sharing & email-OTP), `budget_categories`
(category-level planned budgets), `seating_tables` + `seating_assignments`
(table planner), and `moodboard_items` + `attire_items` (mood/attire). Then
`npm install` to pick up new packages (`@react-pdf/renderer`, `resend`).

Optional services (all degrade gracefully if unset — see `.env.local.example`):
- **Live FX** (Combined Finance): `EXCHANGE_RATE_API_KEY`.
- **Email** (monthly RSVP digest + share-link OTP gate): `RESEND_API_KEY`,
  `RESEND_FROM`, `DIGEST_RECIPIENTS`, `CRON_SECRET`. The monthly digest is wired
  via `vercel.json` cron (1st of each month, 09:00 UTC) hitting `/api/digest`.
- **Public share reads / RSVP writes / OTP**: require `SUPABASE_SERVICE_ROLE_KEY`.
