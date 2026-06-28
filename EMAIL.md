# Email deliverability — Two Weddings

The app sends email via [Resend](https://resend.com) for: the monthly RSVP
digest, new-RSVP alerts, weekly task reminders, RSVP confirmations to guests,
and share-link one-time codes. For these to land in the **inbox** (not spam),
your sending domain needs SPF, DKIM, and DMARC set up. Do this once.

> If you skip this, all email features simply no-op — the app still works.

---

## 1. Verify your domain in Resend
1. Resend dashboard → **Domains** → **Add Domain** → enter your domain (e.g. `ourwedding.com`). Use a domain you control, not a free `gmail.com`.
2. Resend shows a set of **DNS records** to add. Keep that tab open — you'll copy them in step 2.
3. Set `RESEND_FROM` to an address on that domain, e.g. `RESEND_FROM="Two Weddings <hello@ourwedding.com>"`. The from-domain **must** match the verified domain or mail will fail/spam.

## 2. Add the DNS records (at your domain registrar / DNS host)
Add exactly what Resend displays. There are three things they cover:

| Purpose | Type | Host (example) | Value |
|--------|------|----------------|-------|
| **SPF** — authorises Resend to send for you | TXT (or MX, as Resend shows) | `send` / `send.ourwedding.com` | copy verbatim from Resend (e.g. `v=spf1 include:amazonses.com ~all`) |
| **DKIM** — cryptographically signs your mail | TXT or CNAME (usually 1–3) | `resend._domainkey…` | copy verbatim from Resend (long key — paste exactly) |
| **DMARC** — tells inboxes what to do if checks fail | TXT | `_dmarc.ourwedding.com` | `v=DMARC1; p=none; rua=mailto:you@ourwedding.com` |

Notes:
- **DKIM** values are unique per domain — only Resend's exact strings work.
- Start DMARC at **`p=none`** (monitor only). After a week or two of clean reports, tighten to `p=quarantine`, then `p=reject`.
- DNS can take from minutes up to ~48h to propagate. Resend's Domains page flips to **Verified** when ready — wait for that before testing.

## 3. Verify it's working
- In Resend, the domain shows **Verified** (green) for SPF + DKIM.
- Send yourself a test (e.g. trigger `/api/reminders?key=…` or submit a test RSVP).
- In Gmail, open the email → **⋮ → Show original**. You want:
  - **SPF: PASS**
  - **DKIM: PASS**
  - **DMARC: PASS**
- Run a free scan at **https://www.mail-tester.com** (send to the address it gives you) — aim for **9–10/10**.
- Check DNS with **https://mxtoolbox.com** (SPF / DKIM / DMARC lookups).

## 4. Inbox test matrix
Send one real message to each and confirm it lands in the **Inbox**, not Spam/Junk/Promotions.

| Provider | Inbox? | SPF | DKIM | DMARC | Notes |
|----------|:-----:|:---:|:----:|:-----:|-------|
| Gmail | ☐ | ☐ | ☐ | ☐ | use "Show original" |
| Outlook / Hotmail | ☐ | ☐ | ☐ | ☐ | |
| Apple Mail / iCloud | ☐ | ☐ | ☐ | ☐ | |
| Yahoo (if guests use it) | ☐ | ☐ | ☐ | ☐ | |

## 5. Troubleshooting
- **Lands in spam with DKIM pass** → add/spread DMARC; warm up by sending a few real messages over a few days; avoid spammy subject lines and all-image emails (our templates are text-based, which helps).
- **SPF softfail / `~all`** → fine to keep `~all`; don't use `-all` until everything passes.
- **DMARC fails but SPF/DKIM pass** → alignment issue: ensure `RESEND_FROM` domain matches the DKIM/verified domain (no sending from a different subdomain).
- **Nothing arrives** → check Resend dashboard → **Logs** for bounces/blocks; confirm `RESEND_API_KEY` + `RESEND_FROM` are set on the **host** (not just local).
- **Codes/alerts delayed** → transactional email is near-instant; delays usually mean the receiving provider is greylisting a new domain — improves as the domain ages.

## Quick reference
- Env: `RESEND_API_KEY`, `RESEND_FROM` (verified domain), `DIGEST_RECIPIENTS`, `CRON_SECRET`.
- Endpoints: `/api/digest` (monthly), `/api/reminders` (weekly) — both protected by `CRON_SECRET`.
- Tools: mail-tester.com (score), mxtoolbox.com (DNS), Gmail "Show original" (per-message auth).
