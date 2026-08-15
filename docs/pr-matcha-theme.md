# Matcha theme — PR description

Draft copy for `feat/matcha-theme` → `develop`. 13 commits, 70 files,
+2430 / −489.

## PR description

### Matcha theme: palette, mono chrome, drawn icon set, photo branding

Redesigns the app's colour, typography and iconography around the
[Matcha Home](https://thematchavibe.notion.site/Matcha-Home-85948c1f1d974ab2b9a4850c8fe94864)
template, then swaps the brand imagery to the couple photo. No schema change,
no env change, no migration.

#### What changed

- **One source of colour and type** — new `lib/tokens.js`, read by Tailwind at
  build time, by app code, by `@react-pdf`, and by the inline email styles.
  306 `-ink-` class occurrences migrated to `-stone-`; none remain.
- **Mono for chrome, sans for content** — IBM Plex Mono (with the `vietnamese`
  subset) for nav, labels, numerals and dates; Noto Sans for guest names and
  free text, so Vietnamese and Chinese keep glyph coverage. No CJK webfont —
  Chinese falls through to the system stack declared in `lib/tokens.js`.
- **Hand-drawn icon set** — 25 generated icons replace the emoji that were
  doing UI work. Tremor is baked into the path data at design time, not
  applied at runtime with an SVG filter, so the nav costs nothing extra to
  repaint (this was the point of `9eea130`).
- **Photo branding** — the couple photo is now the favicon, iOS icon, PWA
  icons, link-share card, login avatar and sidebar mark. Derived from one
  source by `scripts/build-brand-images.mjs`.
- **Flat surfaces** — separation comes from hairline borders; `shadow-card`
  and `shadow-pop` still resolve but are near-invisible.

#### Accessibility fixes found along the way

The redesign introduced contrast regressions that were not obvious by eye.
All measured, all fixed:

| | Before | After |
|---|---|---|
| Login header (white on pale green) | 1.09–1.13:1 | 6.26–12.26:1 |
| Focus ring, inputs and buttons | 1.13 / 1.28:1 | 3.36 / 4.5:1 |
| `.label` | 3.2:1 | 6.48:1 |
| Badge `neutral` (the default tone) | 3.96:1 | 5.73:1 |
| Control borders | 1.22:1 | 3.20:1 |

The focus-ring one is the most consequential: every button and input in the
app had an effectively invisible focus indicator, so keyboard navigation had
no visible target anywhere.

#### PDF export was silently broken, and is fixed here

Worth reading even if the rest is skimmed, because the failure mode is not
specific to this branch.

`lib/pdf/documents.jsx` read the bundled Noto Sans TTFs with `fs.readFileSync`,
and `next.config.mjs` used `outputFileTracingIncludes` to force them into the
`/api/pdf/[kind]` serverless bundle — the documented mechanism for exactly this.
**Turbopack ignores it.** Measured on this branch:

| Build | `.ttf` files traced into the function |
|---|---|
| webpack | 2 |
| Turbopack — Next 16's default, and what Vercel runs | **0** |

Neither build warns, and it works locally because `cwd` there happens to contain
`lib/pdf/fonts/`. In production `readFileSync` threw `ENOENT` and PDF export
returned 500. This branch introduced it: on `develop` the PDF used built-in
Helvetica and read no files.

The fix is bundler-agnostic rather than another tracing hint — the font bytes
are imported from `lib/pdf/fonts.generated.js` (base64, 198KB, produced by
`npm run pdf-fonts:build`), so any builder bundles them. The dead config key was
removed rather than left looking authoritative.

Verified three ways: the Turbopack build now ships the fonts in the function's
own chunk; a PDF rendered from a temp `cwd` containing no fonts produced valid
`%PDF-` output with an embedded subset; and all 10 sampled Vietnamese codepoints
(`ả ữ ộ ầ ế ị ỹ Đ`) are present in the PDF's ToUnicode map. The authenticated
round trip on the preview deployment has **not** been exercised — the route is
behind the PIN gate.

#### Regression gate

`npm run audit:theme` — four checks that all fail *silently* in a browser, so
they are scripted rather than eyeballed:

- **shades** — a class naming a shade the ramp doesn't define (`bg-matcha-250`)
  emits no CSS at all, and Tailwind does not warn.
- **contrast** — every token pair against its WCAG floor.
- **wiring** — that `globals.css` and `Button.jsx` actually use the tokens the
  contrast check asserts, that no `@apply block` reintroduces the component
  collision, and that every `<Icon name="…">` resolves.
- **emoji** — a budget that can only go down.

Plus `npm run icons:verify`, which regenerates `Icon.jsx` and diffs it against
the committed file. Each check was verified by injecting a regression and
confirming a non-zero exit.

#### Worth a reviewer's attention

- **Two icon generators.** `scripts/build-icons.py` is the reference, but
  there is no Python interpreter on the dev machine and winget could not
  reach the network, so `scripts/build-icons.mjs` ports it to Node —
  CPython's MT19937 (`init_by_array` + `genrand_res53`), the same RNG draw
  order, and Python's float formatting. It reproduces the committed
  `Icon.jsx` byte-for-byte, and `icons:verify` keeps it honest. Both files
  received identical definitions for the new icons. **This is a real
  maintenance smell** — two sources that must stay in sync — and the obvious
  resolution is to delete one once Python is available.
- **`gold` button variant still fails AA.** White on `gold-500` measures
  2.93:1 across 9 primary CTAs. `gold-700` clears it at 6.61:1 but visibly
  darkens the primary action, so it was left as a design call rather than
  changed unilaterally.
- **Hairline borders on cards are a deliberate WCAG deviation.** `stone-200`
  is 1.22:1. WCAG 1.4.11 exempts decorative container boundaries but not the
  boundary identifying a control, so *control* borders were raised to
  `stone-500` and card borders were left alone. Nothing on the ramp between
  those two steps clears 3:1.
- **54 emoji remain, deliberately.** 10 flag emoji (HP/KK identity belongs to
  the `hp`/`kk` tokens), 2 `"✓"` written into XLSX/CSV export *cells* (data,
  not UI), `RsvpView`'s `SYMBOL` map (its `?` and `+` have no icon
  counterpart, so converting half would read worse), 3 `clickHint` prose
  strings in en/vi/zh, and 36 phase-2/3 decoration. The budget comment in
  `scripts/audit-theme.js` records each.

#### Deploy notes

- **`sw.js` CACHE is bumped to `tw-v4`.** `public/` art is unhashed and served
  cache-first, so without the bump returning users keep the old icons
  indefinitely. Bump it again on any future change to unhashed `public/` art.
- The service worker now registers in **production only**. In dev it cached
  Turbopack's stable-filename `/_next/static` chunks and served stale CSS
  across edits, which is a genuine trap when doing theme work.
- `next.config.mjs` pins `turbopack.root`. A stray `package-lock.json` in the
  user's home directory made Turbopack infer the whole profile as the
  workspace root — it resolved imports against the wrong `node_modules` and
  OOM'd the dev server.
- Branding weight is 440KB total. Plain PNG of a photograph came to 2.6MB;
  icons are palette-quantised and the share card is JPEG.

#### Not included

- **Dark mode.** Doesn't exist and wasn't added. The extracted Notion tokens
  include a dark set (`#263D30` block, `#50946E` text) if it's wanted later.
- **Visual regression tests.** None. Verification was `next build`, `eslint`,
  `audit:theme`, and computed styles read out of a live page — not
  screenshots.
- **The `囍` logo has not had a native reader's eye.** Its structure was
  matched against the Noto Sans CJK SC glyph for U+56CD, but it is no longer
  user-facing: the sidebar and all icons now use the photo. The generated
  `mark` icon is retained, unreferenced, so reverting is a one-line change.

#### Verified

`npm run build`, `npm run lint`, `npm run audit:theme` and `npm run icons:verify`
all pass. Fonts, CJK glyph rendering and Vietnamese diacritics were confirmed in
a running page rather than assumed, and the branding assets were confirmed
serving from the Vercel preview at the byte sizes they were built at.

`npm run lint` now exits 0. It previously reported hundreds of errors from
`.next` output inside `.claude/worktrees/` — `eslint-config-next` only ignores
`/.next` at the repo root, so agent worktree builds were linted and drowned out
real findings. Generated sources are deliberately still linted; they pass.

Not verified: the authenticated PDF download on the preview deployment, and
anything else behind the PIN gate.
