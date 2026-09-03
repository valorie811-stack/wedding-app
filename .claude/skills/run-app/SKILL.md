---
name: run-app
description: Launch this wedding-planner app and drive it in a real browser to see a change working. Use this whenever you need to run, start, preview, screenshot, or click through the app — or to confirm a change actually renders rather than only that it compiles. Covers the preview-mode setup that skips the PIN gate and serves seed data, starting and stopping the dev server, and the headless-Chromium driver (there is no chromium-cli here). Reach for this before reporting a UI change as verified.
---

# Running this app

`npm run build` proves the app compiles. It does not prove a page renders, that
totals add up, or that a dropdown has the options you think it has. Several
defects in this repo's history were invisible to the build and obvious the
moment a page was on screen — a category showing over budget because two seed
rows described the same payment, money counted in a rollup with no line to
explain it. So when a change touches what a user sees, get it on screen.

## 1. Run in preview mode

Preview mode is the fastest way in and usually the *better* test: with no
`.env.local`, `lib/supabase/middleware.js` disables the PIN gate entirely
(`gateEnabled` is false when Supabase is unconfigured and `APP_PIN` is unset),
so every route is reachable with no login. Data comes from `lib/seed-data.js`.

The seed set is deliberately richer than the live database — two weddings, both
currencies, vendors in several contract states — so it exercises paths that live
data may have only one example of. Prefer it unless you are specifically
verifying live data.

```bash
ls .env.local          # expect: not found. If it exists, you are NOT in preview mode.
```

To test against live Supabase instead, fill `.env.local` from
`.env.local.example`; you then need the owner PIN to get past `/login`.

## 2. Start the dev server

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill 2>/dev/null      # free the port first
nohup npm run dev > /tmp/dev.log 2>&1 &
timeout 90 bash -c 'until curl -sf http://localhost:3000/dashboard >/dev/null 2>&1; do sleep 1; done' \
  && echo "SERVER UP" || tail -20 /tmp/dev.log
```

Poll the port rather than sleeping — Next compiles routes on demand and the
first request to a route is slow, so a fixed sleep is either wasteful or too
short. Stop it by killing the listener, not `$!`: npm does not forward SIGTERM
to the server it spawns, so the port stays bound and the next run hits
`EADDRINUSE`. Avoid a broad `pkill -f` — it can match the agent's own process.

## 3. Drive it

There is no `chromium-cli` in this container, but Playwright's Chromium is
pre-installed. Two things bite here, which is why `scripts/drive.mjs` exists:

- The binary lives at `/opt/pw-browsers/chromium-<version>/chrome-linux/chrome`.
  The unsuffixed `/opt/pw-browsers/chromium/...` path does **not** exist, so a
  hardcoded path fails. The script discovers the versioned directory instead.
- `playwright` itself is not a project dependency. Install `playwright-core`
  into a scratch directory — not the repo — so `package.json` stays clean.
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is already set, so no browser is fetched.
  Node resolves imports relative to the *script's* location inside the repo, not
  your cwd, so that scratch install is invisible to a bare import: point
  `PW_DIR` at the directory holding `node_modules` and the script resolves it
  explicitly.

```bash
cd "$SCRATCH" && npm init -y >/dev/null && npm i playwright-core --no-audit --no-fund
```

Quick look at one route:

```bash
PW_DIR="$SCRATCH" SHOT_DIR="$SCRATCH" node .claude/skills/run-app/scripts/drive.mjs /budget budget
```

Anything more, import the helper — write your script into `$SCRATCH`, import
`drive.mjs` by absolute path, and run it with `PW_DIR` set. `page.goto_(path)`
prefixes the base URL and waits for network idle; `errors` collects console and
page errors with the agent proxy's `ERR_TUNNEL_CONNECTION_FAILED` noise already
filtered out:

```js
import { withPage } from "/home/user/wedding-app/.claude/skills/run-app/scripts/drive.mjs";

const { errors } = await withPage(async (page) => {
  await page.goto_("/budget");
  await page.waitForSelector("text=Budget");
  console.log(await page.locator("li:has-text('Vendor')").allInnerTexts());
  await page.screenshot({ path: "budget.png", fullPage: true });
});
console.log("errors:", errors.length ? errors : "none");
```

**Look at the screenshot.** Reading extracted text confirms strings exist; it
does not show a total in red, a broken layout, or a duplicated row. Both of the
seed-data defects found this way were visible in the image and invisible in the
text dump.

## 4. Selectors that work here

The UI is Tailwind with no test ids, so target visible text and structure:

| Need | Selector |
|---|---|
| A card by its content | `page.locator(".group", { hasText: "Vendor name" })` |
| Edit/Delete on a card | `card.locator("button", { hasText: "Edit" })` — plain buttons with text, no aria-label |
| A `<select>` by its options | count `page.locator("select")`, then read `.locator("option").allInnerTexts()` to tell filters from form fields — the page filters and the modal's fields are all plain selects |
| Money / totals | read `page.locator("body").innerText()` and match, rather than guessing a class |

Wait on a selector, never a bare timeout — the first paint of a route can take
10s+ while Next compiles it.

## 5. A path worth walking

Money spans Vendors, Budget and Combined Finance, and those are derived from
each other, so a change in one shows up in the others. When touching any of it:

1. `/budget` — vendor deposits appear under their category tagged `Vendor`;
   no category unexpectedly shows "over budget".
2. `/vendors` — open a vendor, check the category dropdown lists that wedding's
   budget categories; switch the wedding picker and confirm the options change
   (Hải Phòng has `Florals`, Kota Kinabalu has `Transport` — a good tell).
3. `/finance` — per-wedding spend equals manual budget items plus vendor
   deposits. Reconcile the arithmetic by hand; a plausible-looking total is the
   easiest place for a double-count to hide.

## Gotchas

- **`@/` imports break bare node.** `lib/*.js` uses the `@/` alias, so
  `node -e "import('./lib/data.js')"` fails to resolve. To unit-check a pure
  function, read the file and extract the function source rather than importing
  it — or just drive the UI, which exercises the real path anyway.
- **`ERR_TUNNEL_CONNECTION_FAILED` in the console is environment noise**, not an
  app error. `drive.mjs` filters it; do not chase it.
- **Preview mode writes nothing.** Saves are in-memory only and a reload
  discards them, which is fine for reading but means you cannot verify
  persistence without a live `.env.local`.
