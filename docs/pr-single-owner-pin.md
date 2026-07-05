# Single-owner PIN — commit message & PR description

Draft copy for the branch that converts the app to single-owner PIN auth.

## Commit message

```
feat(auth)!: single-owner PIN login; drop magic-link, roles & link sharing

Replace the multi-user, magic-link app with a single-owner tool the couple
unlock with one shared PIN.

- Auth: PIN setup/unlock (scrypt hash in new app_settings table), signed
  httpOnly session cookie (Web Crypto, Edge-safe), PIN guard in proxy.js.
  Add lib/auth/{pin,session}.js, components/auth/PinForm.jsx,
  app/login/actions.js. Remove magic-link login, /auth/callback.
- Data: route all server DB access through the service-role key so cloud
  data works behind the PIN (lib/supabase/server.js). getCurrentMember now
  returns a fixed owner; getMembersData removed.
- Single owner: remove roles/members/invites, is_member() RLS, and the
  Settings→Access page. Settings becomes change-PIN + sign-out. Sidebar/
  AppShell no longer gate by role.
- Sharing: delete /share and /rsvp-form routes, ShareButton, QR, WhatsApp,
  and the email-OTP gate. RSVPs are entered in-app. Keep Excel/CSV/PDF
  static exports (ExportButton).
- Schema: add app_settings; drop members/invites/shares/share_otps and the
  is_member/is_owner/accept_invite/handle_new_user helpers; RLS enabled with
  no policies (locked to service role). Idempotent.
- Docs/env/i18n: rewrite README and .env.local.example
  (SUPABASE_SERVICE_ROLE_KEY + APP_SESSION_SECRET now required); update
  EN/VI/ZH strings.

BREAKING CHANGE: requires SUPABASE_SERVICE_ROLE_KEY and APP_SESSION_SECRET,
and a re-run of supabase/schema.sql. Existing members/invites/shares data is
dropped. Guest self-service RSVP is removed.
```

## PR description

### Single-owner PIN app

Converts the planner from a multi-user, magic-link app into a single-owner
tool for the bride & groom, unlocked with one shared PIN. Data stays in
Supabase and syncs across both devices.

#### What changed
- **PIN auth** replaces magic-link. First run sets the PIN; after that it's
  PIN-to-unlock. PIN is scrypt-hashed in `app_settings`; unlock issues a
  signed 30-day session cookie checked in `proxy.js`.
- **Single owner** — removed roles, members, invites, `is_member()` RLS, and
  Settings→Access. Settings is now change-PIN + sign-out; all modules visible.
- **Cloud sync via service role** — server DB access uses the service-role
  key (bypasses RLS), centralized in `lib/supabase/server.js`.
- **Link sharing removed** — deleted `/share`, `/rsvp-form`, ShareButton, QR,
  WhatsApp, and the OTP gate. RSVPs are recorded in-app.
- **Static exports kept** — Excel/CSV and PDF run-sheet/budget unchanged.

#### Migration (required)
1. Set `SUPABASE_SERVICE_ROLE_KEY` and `APP_SESSION_SECRET`
   (`openssl rand -hex 32`) in `.env.local` / Vercel env.
2. Re-run `supabase/schema.sql` (adds `app_settings`, drops the old
   members/invites/shares tables — idempotent).
3. Deploy and set the shared PIN on first launch.

#### Notes
- **Breaking:** guest self-service RSVP is gone — the couple enter responses
  in the RSVP module.
- Verified: static syntax parse + broken-import scan clean. `next build` and
  final commit done locally (sandbox can't build).
