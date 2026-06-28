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

## 4. Configure auth redirects
1. Left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: add `http://localhost:3000/auth/callback`
4. (Recommended for a private app) **Authentication → Providers → Email** →
   turn **off** "Allow new users to sign up" once everyone's invited, so only
   known emails can get in. *(Leave it on for your own first sign-in.)*

## 5. Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000 → enter **your** email → click the magic link in your inbox.
The **first** account to sign in automatically becomes the **owner**.

## Troubleshooting
- *Still says "Preview data"* → keys missing/typo'd in `.env.local`, or you didn't
  restart `npm run dev` after editing it.
- *Magic link 404s* → the `/auth/callback` redirect URL in step 4 doesn't match.
- *Signed in but dashboard is empty* → you didn't run `seed.sql` (step 2.3).
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
