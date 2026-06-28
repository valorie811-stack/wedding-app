# Launch & UAT — Two Weddings

Phase 5 go-live guide for the Hải Phòng (8–10 Oct 2027) and Kota Kinabalu
(16–17 Oct 2027) weddings. Work top to bottom; check each box as you go.

---

## 1. Pre-launch setup

**Database & app**
- [ ] Supabase project created; `supabase/schema.sql` run (no errors).
- [ ] `supabase/seed.sql` run (optional once you add real data).
- [ ] `npm install` (picks up `@react-pdf/renderer`, `resend`).
- [ ] `.env.local` filled from `.env.local.example`:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (required for public share reads, RSVP writes, OTP)
  - [ ] `NEXT_PUBLIC_SITE_URL` = your live URL
  - [ ] `EXCHANGE_RATE_API_KEY` (optional — live FX on Finance)
  - [ ] `RESEND_API_KEY`, `RESEND_FROM`, `DIGEST_RECIPIENTS`, `CRON_SECRET` (optional — email)
- [ ] `npm run build` passes locally.

**Deploy**
- [ ] Deployed to host (e.g. Vercel); all env vars set in the host dashboard too.
- [ ] Supabase → Auth → URL Configuration: Site URL + `…/auth/callback` redirect match the live URL.
- [ ] First sign-in works; the first account becomes **owner**.
- [ ] "Allow new signups" turned **off** after the owner is in (invite-only).
- [ ] Monthly digest cron present (`vercel.json` → `/api/digest`, 1st @ 09:00 UTC) and `CRON_SECRET` set.

**Data readiness**
- [ ] Real guests imported / entered; sides + dietary correct.
- [ ] Each guest invited to the right events; RSVP statuses seeded as known.
- [ ] Budget categories + planned amounts set; expenses logged.
- [ ] Vendors entered with contract status + payment progress.
- [ ] Tables created; key guests pre-seated.

---

## 2. Smoke test (5 min, on the live site)

- [ ] Dashboard loads; countdowns + RSVP donut + budget bars render; **no "Preview data" badge**.
- [ ] Language toggle EN / VI / 中文 changes all labels.
- [ ] Scope switcher (Both / HP / KK) filters every module.
- [ ] Each module opens without error: Dashboard, Scheduler, Planning, Guests, RSVP, Tables, Budget, Finance, Vendors, Mood Boards, Attire, Traditions, Settings.
- [ ] Finance shows **Live rates** badge (if FX key set) and the two charts.
- [ ] Run-sheet PDF (Scheduler ⬇ PDF) and budget PDF (Finance ⬇ PDF) download and open.
- [ ] Excel/CSV export works on Guests, Vendors, Budget.

---

## 3. UAT script

Run these as real end-to-end scenarios. Note pass/fail + notes for each.

### A. Couple (owner)
1. Sign in via magic link on a phone. → lands on Dashboard.
2. Add a guest, invite them to the HP reception + KK banquet, set dietary = halal. → appears in Guests and in the RSVP matrix.
3. In RSVP, change that guest's HP status to Confirmed by tapping the cell. → donut/counts update.
4. Add a budget category (e.g. "Music", planned) and an expense under it. → Finance totals update.
5. Create a **read-only Guest list link** (scope = Both, expiry 30 days), copy it, open in a private window. → shows read-only list, no edit controls.
6. Create an **RSVP form link**, open it, submit a test RSVP. → appears in Guests/RSVP.
7. Generate the run-sheet PDF and check the times/venues read correctly.
8. Settings → invite the planner (role = planner) and a parent (role = family).

### B. Wedding planner
1. Accept the invite; sign in. → sees planner's module set (no Settings).
2. Open Scheduler, Vendors, Budget, Tables; confirm data is correct.
3. Drag a guest between two tables on the Table Planner. → seat counts update.
4. Download the vendor list (Excel) and confirm contacts + payment columns.

### C. Family / bridal party / guest (restricted roles)
1. Family member signs in → sees only their modules (Dashboard, Scheduler, Mood Boards, Finance, Traditions, Planning).
2. Family member types `/guests` in the address bar directly. → **"No access"** screen (guard works).
3. Bridal party member opens RSVP + Attire + Traditions only.
4. Read the Traditions guide in all three languages — content renders correctly.

### D. Mobile / PWA
1. On a phone, open the site → "Add to Home Screen" → launches standalone.
2. Edit/delete buttons are tappable (visible without hover) on Guests, Budget, Vendors, Tables.
3. Tables, RSVP matrix, and Finance charts scroll/resize cleanly.
4. Turn on airplane mode and reopen → offline page (or cached page) appears.

---

## 4. Sharing audit

- [ ] **Expiry**: create a link with a short expiry; after it passes, the link shows "Link expired".
- [ ] **Revoke**: revoke an active link; reopening shows "Link revoked".
- [ ] **OTP gate**: create a Guest list link with "require email verification"; opening it asks for an email, sends a code, and only reveals content after the correct code. Wrong/expired code is rejected.
- [ ] **Scope**: an HP-scoped link shows only HP data.
- [ ] **No PII leak**: the public Guest list does not show emails/phones.
- [ ] **WhatsApp / QR**: the WhatsApp button prefills the link; the QR scans to the right URL.

---

## 5. Load / stress test (before the busy RSVP window)

Goal: confirm the public RSVP form, guest list, and table plan stay responsive
when many guests hit the site at once (e.g. right after invitations go out).

**Quick manual test**
- [ ] Have 5–10 people open the RSVP link and submit within the same minute; all succeed and appear in the dashboard.

**Scripted test (optional, using [k6](https://k6.io))** — point at your live RSVP form token:
```js
// save as rsvp-load.js → run: k6 run rsvp-load.js
import http from "k6/http";
import { sleep, check } from "k6";
export const options = { vus: 50, duration: "1m" }; // 50 concurrent users for 1 min
export default function () {
  const res = http.get(__ENV.URL); // e.g. URL=https://yoursite/rsvp-form/<token>
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
```
- [ ] p95 response time stays acceptable (< ~1.5s) at expected peak.
- [ ] No 5xx errors; Supabase dashboard shows no row-limit / rate issues.
- [ ] Re-run after submitting many test RSVPs, then **clean up test rows** in Supabase.

---

## 6. Go-live day

- [ ] Final `npm run build` + deploy from a clean `main`.
- [ ] Re-run the smoke test (section 2) on production.
- [ ] Send one real share link to yourself on Gmail, Outlook, and Apple Mail; confirm it isn't in spam (if using email features, set up SPF/DKIM/DMARC on the `RESEND_FROM` domain first).
- [ ] Send invitations with the RSVP link / QR.
- [ ] Watch the first day's RSVPs land correctly.

**Rollback:** redeploy the previous build from the host dashboard. Data in
Supabase is unaffected by app redeploys.
