# Matcha theme — handoff

Redesign of the app's logo, palette, typography and icon set, based on the
[Matcha Home](https://thematchavibe.notion.site/Matcha-Home-85948c1f1d974ab2b9a4850c8fe94864)
Notion template.

Work is **on branch `feat/matcha-theme`**, branched from `develop`. All file
changes are on disk and staged, but **nothing is committed yet** — see step 1.

> **Historical record.** This describes the handoff as written; the steps below
> were carried out and the branch has since shipped to `main`. What has changed
> since, so the file map below is not read as current:
>
> - The generator is `scripts/build-icons.mjs`, run with `npm run icons:build`.
>   `build-icons.py` was removed once the Node version was proven to reproduce
>   `Icon.jsx` byte-for-byte.
> - The set is 25 icons, not 17 — the `喜` mark plus seven UI affordances.
> - `public/mark.svg` was deleted; the mark is generated into `Icon.jsx`.
> - Icon branding was later replaced by a photograph; `public/icon.svg` and
>   `icon-maskable.svg` are gone.
> - `npm run audit:theme` guards the palette, contrast and emoji budget.

---

## 1. Unblock git and commit

The staging ran in a sandbox whose mount allows writes but blocks deletes, so
`git add` left a zero-byte `.git/index.lock` behind that it couldn't clean up.
Every git write fails until it's removed.

```powershell
cd C:\Users\valor\dev\wedding-app
git branch --show-current      # expect: feat/matcha-theme
del .git\index.lock
```

Then drop the files that got swept into the index but don't belong in this
commit. `next.config.mjs` and `lib/pdf/fonts/` were your own uncommitted work
from before this task; the four `scripts/*.py` files are scratch generators that
have since been consolidated into `scripts/build-icons.py`.

```powershell
git restore --staged next.config.mjs lib/pdf/fonts
git restore --staged scripts/build.py scripts/fix.py scripts/fix2.py scripts/geniconlib.py
del scripts\build.py scripts\fix.py scripts\fix2.py scripts\geniconlib.py
rmdir /s /q scripts\__pycache__

git add scripts/build-icons.py
git status                     # expect 46 files: 45 modified/added + build-icons.py
git commit -m "feat(theme): matcha palette, mono chrome, hand-drawn icon set"
```

**Caveat on one file.** `lib/pdf/documents.jsx` carries both your in-progress
Noto Sans font-registration work *and* this task's token refactor. They aren't
cleanly separable. If you want them split, `git restore --staged` it and stage
the two hunks by hand with `git add -p`.

---

## 2. Verify the build (not done — could not be)

None of this ran during the task. The sandbox had no DNS, and `next/font/google`
fetches at build time, so `next build` hung with no output. **Treat the build as
unverified.**

```powershell
npm run dev
```

Check in this order, since each rules out a different failure:

1. **Any page loads at all** — confirms `next/font/google` resolved IBM Plex Mono
   and Noto Sans. This is the single most likely thing to break, and it will fail
   loudly at build time rather than silently.
2. **Login screen** — `PinForm` lost a radial-gradient background for a flat
   `bg-matcha-100`. Check it doesn't look empty.
3. **Sidebar** — 13 drawn icons, mint pill on the active item, `喜` mark top-left.
4. **Traditions page** — 5 cards, drawn icons, and **Chinese renders as characters
   not boxes**. Worth a specific look: `--font-sans` relies on a per-glyph fallback
   through to `Noto Sans SC` / `PingFang SC` / `Microsoft YaHei`, which I could not
   test.
5. **Finance and Dashboard** — recharts fills now come from `lib/tokens.js`.
6. **Vietnamese diacritics** in mono chrome — nav labels, table headers, dates.
   IBM Plex Mono is loaded with the `vietnamese` subset; confirm `ả ữ ộ` are right.

Then:

```powershell
npm run build
npm run lint
```

`npm run lint` also never ran — it timed out in the sandbox. Expect it to have
opinions about the `<img>` in `Sidebar.jsx`; there's already an eslint-disable
for `@next/next/no-img-element` on that line, but check nothing else surfaced.

---

## 3. What was verified

Offline checks that did pass, so you can skip re-testing these:

- `lib/tokens.js` loads; every ramp is valid 6-digit hex.
- All 59 `tokens.*` references across the codebase resolve to real keys.
- All 23 changed JS/JSX files parse (Babel, JSX plugin).
- Tailwind + PostCSS compile `app/globals.css` with no warnings; `.card`,
  `.block`, `.section-title`, `.label`, `.input`, `.btn`, `.numeric` and
  `.chrome` all emit, and `.section-title` resolves to `#EDF3EC`.
- Zero `-ink-` class names remain (273 migrated to `-stone-`).
- Zero hardcoded theme hex outside `lib/tokens.js`.
- Zero emoji remain in `lib/traditions.js` or `TraditionsView.jsx`.
- `scripts/build-icons.py` reproduces `components/ui/Icon.jsx` byte-for-byte.

---

## 4. Design decisions, so you don't re-litigate them

| Decision | Why |
|---|---|
| HP `#B0503D` terracotta, KK `#2F6E7A` sea teal | The old crimson/teal both fight sage green. KK was pushed bluer specifically so it reads distinct from the matcha chrome. |
| IBM Plex Mono, not iA Writer Mono | The template uses iA Writer Mono. It's OFL-licensed but ships no Vietnamese subset. Plex Mono is its parent design and does — non-negotiable given Hải Phòng guest names. |
| Mono for chrome, sans for content | Full mono-everywhere loses CJK glyph coverage and rhythm. Nav/labels/numerals are mono; guest names and free text are Noto Sans. |
| No CJK webfont | Noto Sans SC is multi-megabyte. Chinese falls through to the system CJK stack declared in `lib/tokens.js`. |
| Tremor baked into path data, not an SVG filter | A runtime `feDisplacementMap` would re-run on all 13 nav icons every repaint, against the grain of commit `9eea130 perf(nav): fix slow tab switching`. |
| 囍 logo, hand-constructed | Structure was matched against the real Noto Sans CJK SC glyph for U+56CD. **Still worth a native reader's eye before it goes anywhere public.** |
| `🎁` → mâm quả, `💒` → rings | The Lễ Ăn Hỏi card describes offering trays, and a chapel is the wrong tradition for a ceremony centred on the ancestral altar. |
| Flat surfaces | `shadow-card` / `shadow-pop` still exist so existing utilities resolve, but are now near-invisible. Separation comes from hairline borders. |

---

## 5. File map

**New**

- `lib/tokens.js` — single source of colour and type. Plain CommonJS with no
  imports so Tailwind (build time), app code (webpack interop), `@react-pdf`
  and inline email styles can all read it.
- `components/ui/Icon.jsx` — generated icons. **Do not hand-edit**; regenerate.
- `scripts/build-icons.py` — the generator. `python3 scripts/build-icons.py`.
  *(Superseded: the generator is now `scripts/build-icons.mjs`, run with
  `npm run icons:build`. See the note at the top of this file.)*
- `public/mark.svg` — single `喜`, for the sidebar and favicon where `囍` is
  unreadable. *(Superseded: the mark is generated into `Icon.jsx` and this file
  was removed.)*

**Replaced**

- `public/icon.svg`, `public/icon-maskable.svg` — `囍` split across HP and KK.
- `tailwind.config.js`, `app/globals.css` — palette, mono/sans stacks,
  `tracking-chrome` (0.055em, matching the template's 0.825px at 15px).

**Refactored to read from tokens**

`lib/theme.js`, `lib/pdf/documents.jsx`, `lib/email.js`, `lib/digest.js`,
`lib/reminders.js`, `components/dashboard/RsvpDonut.jsx`,
`components/finance/FinanceView.jsx`, `components/calendar/CalendarView.jsx`,
`components/moodboards/MoodboardsView.jsx`.

---

## 6. Known gaps

- **`lib/seed-data.js` moodboard swatches** were remapped to the new palette,
  but the accompanying copy still says "Red & gold" and "Teal & gold". The
  strings now describe colours that aren't there.
- **`lib/i18n/*.js`** may contain emoji in user-facing strings. Not audited.
- **Dark mode** doesn't exist and wasn't added. The extracted Notion tokens
  include a dark set (`#263D30` block, `#50946E` text) if you want it later.
- **Icon set has no empty/error states.** `Icon` returns `null` for an unknown
  name rather than a fallback glyph.
- **No visual regression tests.** Screenshots in this task were generated by
  rendering SVG directly, not by running the app.

---

## 7. Suggested prompt for Claude Code

> I'm on branch `feat/matcha-theme` in the wedding-app repo. Read
> `docs/plans/matcha-theme-handoff.md` first. The theme redesign is staged but
> uncommitted and the build has never been verified. Work through sections 1 and
> 2 of that document: unblock git, commit, then run the dev server and build and
> fix whatever breaks. Report anything that looks visually wrong rather than
> guessing at a fix.
