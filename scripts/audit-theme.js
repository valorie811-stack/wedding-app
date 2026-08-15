#!/usr/bin/env node
/**
 * Theme regression gate. Run with `npm run audit:theme`.
 *
 * Three checks, all of which fail silently in the browser if they regress,
 * which is why they are scripted rather than eyeballed:
 *
 *   1. shades   — a class naming a shade the ramp doesn't define (bg-matcha-250)
 *                 emits no CSS at all. Tailwind does not warn.
 *   2. contrast — the matcha palette is pale; it is easy to pick a step that
 *                 looks fine and measures under the WCAG floor.
 *   3. emoji    — the drawn icon set is supposed to be replacing these. Counts
 *                 are budgeted per phase so the number can only go down.
 *
 * Exits non-zero on any regression.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const t = require(path.join(ROOT, "lib", "tokens.js"));
const SRC_DIRS = ["app", "components", "lib", "context"];

// Phase 1 (action/status glyphs -> drawn icons) took this from 90 to 55.
// Lower it as phases land; it must never rise.
//
// The 55 that remain are deliberate, not a backlog of oversights:
//   10  flag emoji (HP/KK identity) — belongs to the hp/kk tokens, not icons
//    2  "✓" written into XLSX/CSV export cells — data, not UI
//    4  RsvpView SYMBOL — its "?" and "+" members have no icon counterpart,
//       so converting half the set would read worse than leaving it
//    3  clickHint prose in en/vi/zh describing the ✕ affordance
//   36  phase 2/3 decoration (🔔 🔁 📅 👤 📊 …)
const EMOJI_BUDGET = 55;

const RAMPS = { stone: t.stone, matcha: t.matcha, hp: t.hp, kk: t.kk, gold: t.gold };
const WHITE = "#FFFFFF";
const PAGE = "#FBFBFA";

/* ── colour maths ───────────────────────────────────────────────────────── */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const l1 = lum(...hex(a)), l2 = lum(...hex(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return +(((hi + 0.05) / (lo + 0.05))).toFixed(2);
};

/* ── file walk ──────────────────────────────────────────────────────────── */
function sources() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!/node_modules|\.next|\.git|worktrees/.test(p)) walk(p);
      } else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
    }
  };
  for (const d of SRC_DIRS) {
    const p = path.join(ROOT, d);
    if (fs.existsSync(p)) walk(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

/* ── 1. shades ──────────────────────────────────────────────────────────── */
function checkShades() {
  const rx = /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|placeholder|decoration|outline|accent|shadow|caret)-(stone|matcha|hp|kk|gold)-(\d{2,3})\b/g;
  const bad = [];
  for (const f of sources()) {
    const src = fs.readFileSync(f, "utf8");
    let m;
    rx.lastIndex = 0;
    while ((m = rx.exec(src))) {
      const [full, ramp, shade] = m;
      if (!(shade in RAMPS[ramp])) {
        bad.push(`${rel(f)}:${src.slice(0, m.index).split("\n").length}  ${full}`);
      }
    }
  }
  return { name: "shades", fails: bad, detail: "class references a shade the ramp does not define" };
}

/* ── 2. contrast ────────────────────────────────────────────────────────── */
// Card and section borders are intentionally hairline: WCAG 1.4.11 exempts
// purely decorative container boundaries. Control borders are not exempt.
function checkContrast() {
  const pairs = [
    ["body text",             t.stone[900],  PAGE,          4.5],
    ["card text",             t.stone[900],  WHITE,         4.5],
    ["label",                 t.stone[700],  WHITE,         4.5],
    ["input text",            t.stone[900],  WHITE,         4.5],
    ["btn text",              t.stone[800],  WHITE,         4.5],
    ["btn-primary",           WHITE,         t.matcha[600], 4.5],
    ["section-title",         t.matcha[700], t.matcha[100], 4.5],
    ["sidebar active",        t.matcha[700], t.matcha[100], 4.5],
    ["sidebar idle",          t.stone[700],  WHITE,         4.5],
    ["badge neutral",         t.stone[700],  t.stone[100],  4.5],
    ["badge hp",              t.hp[800],     t.hp[100],     4.5],
    ["badge kk",              t.kk[800],     t.kk[100],     4.5],
    ["badge gold/amber",      t.gold[700],   t.gold[100],   4.5],
    ["badge green",           t.matcha[700], t.matcha[100], 4.5],
    ["btn outline text",      t.stone[700],  WHITE,         4.5],
    ["btn ghost text",        t.stone[700],  WHITE,         4.5],
    ["btn danger text",       t.hp[700],     WHITE,         4.5],
    ["btn primary fill",      WHITE,         t.matcha[600], 4.5],
    ["btn hp fill",           WHITE,         t.hp[600],     4.5],
    ["btn kk fill",           WHITE,         t.kk[600],     4.5],
    // UI component contrast (WCAG 1.4.11)
    ["input border",          t.stone[500],  WHITE,         3.0],
    ["btn outline border",    t.stone[500],  WHITE,         3.0],
    ["btn danger border",     t.hp[500],     WHITE,         3.0],
    ["input focus border",    t.matcha[600], WHITE,         3.0],
    ["input focus ring",      t.matcha[500], WHITE,         3.0],
    ["btn focus ring",        t.matcha[600], WHITE,         3.0],
  ];
  const fails = [];
  for (const [name, fg, bg, need] of pairs) {
    const r = ratio(fg, bg);
    if (r < need) fails.push(`${name}: ${r}:1 (needs ${need}:1)`);
  }
  return { name: "contrast", fails, detail: "pair measures under its WCAG floor" };
}

/* ── 3. emoji ───────────────────────────────────────────────────────────── */
function checkEmoji() {
  const rx = /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;
  let total = 0;
  const byGlyph = {};
  for (const f of sources()) {
    const m = fs.readFileSync(f, "utf8").match(rx);
    if (!m) continue;
    total += m.length;
    for (const g of m) byGlyph[g] = (byGlyph[g] || 0) + 1;
  }
  const fails = total > EMOJI_BUDGET
    ? [`${total} occurrences, budget is ${EMOJI_BUDGET}`]
    : [];
  const top = Object.entries(byGlyph).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([g, c]) => `${g}x${c}`).join(" ");
  return {
    name: "emoji",
    fails,
    detail: "emoji count above budget",
    note: `${total}/${EMOJI_BUDGET} occurrences, ${Object.keys(byGlyph).length} distinct  ${top}`,
  };
}

/* ── 4. wiring ──────────────────────────────────────────────────────────── */
// checkContrast() asserts token *pairs*; this asserts globals.css actually
// uses them, so the two can't drift apart and report a false pass.
function checkWiring() {
  const raw = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
  // Comments discuss these selectors by name; match against code only.
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (sel) => {
    const m = css.match(new RegExp(`\\.${sel}\\s*\\{[\\s\\S]*?\\}`));
    return m ? m[0] : "";
  };
  const fails = [];

  if (!/border-stone-500/.test(rule("input"))) fails.push(".input must use border-stone-500 (WCAG 1.4.11)");
  if (!/border-stone-200/.test(rule("card"))) fails.push(".card should keep the stone-200 hairline");

  // Buttons live in Button.jsx, not globals.css. Assert the real source —
  // a .btn rule here would be dead code that looks authoritative.
  const btn = fs.readFileSync(path.join(ROOT, "components", "ui", "Button.jsx"), "utf8");
  if (/\.btn\b/.test(css)) fails.push("globals.css defines .btn, which nothing uses — style buttons in Button.jsx");
  if (!/ring-matcha-600/.test(btn)) fails.push("Button.jsx focus ring must be matcha-600 (WCAG 1.4.11)");
  if (/ring-matcha-[12]00/.test(btn)) fails.push("Button.jsx focus ring is a pale step, under 3:1");
  if (/outline:\s*"[^"]*border-stone-(200|300)\b/.test(btn)) fails.push("Button.jsx outline variant uses a hairline border");
  if (/danger:\s*"[^"]*border-hp-[12]00\b/.test(btn)) fails.push("Button.jsx danger variant uses a hairline border");

  // The .block component shares a name with Tailwind's display utility, so
  // `@apply block` inside @layer components pulls in the mint panel.
  const layer = css.slice(css.indexOf("@layer components"));
  for (const m of layer.matchAll(/@apply([^;]*);/g)) {
    if (/\bblock\b/.test(m[1])) {
      fails.push(`@apply block resolves to the .block component, not display:block — "${m[1].trim().slice(0, 48)}"`);
    }
  }

  // Icon returns null for an unknown name, so a typo renders nothing at all
  // and is invisible in review. Resolve every literal name against the set.
  const iconSrc = fs.readFileSync(path.join(ROOT, "components", "ui", "Icon.jsx"), "utf8");
  const known = new Set(
    [...iconSrc.slice(iconSrc.indexOf("const PATHS"), iconSrc.indexOf("export const ICON_NAMES"))
      .matchAll(/^ {2}([a-zA-Z][a-zA-Z0-9]*):/gm)].map((m) => m[1])
  );
  for (const f of sources()) {
    // Icon.jsx itself contains the literal '<Icon name="' in its dev warning.
    if (rel(f) === "components/ui/Icon.jsx") continue;
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/<Icon\s[^>]*?name="([^"]+)"/g)) {
      if (!known.has(m[1])) {
        fails.push(`${rel(f)}:${src.slice(0, m.index).split("\n").length}  <Icon name="${m[1]}"> is not a known icon`);
      }
    }
  }

  // Controls that bypass .input must not fall back to the hairline.
  for (const f of sources()) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/<(input|select|textarea)\b[\s\S]{0,400}?\/?>/g)) {
      if (/border-stone-(200|300)\b/.test(m[0])) {
        fails.push(`${rel(f)}: <${m[1]}> uses a hairline border; controls need stone-500`);
      }
    }
  }
  return { name: "wiring", fails, detail: "globals.css does not match the asserted contrast pairs" };
}

/* ── run ────────────────────────────────────────────────────────────────── */
const results = [checkShades(), checkContrast(), checkWiring(), checkEmoji()];
let failed = 0;
for (const r of results) {
  const status = r.fails.length ? "FAIL" : "ok";
  console.log(`[${status}] ${r.name}${r.note ? "  — " + r.note : ""}`);
  for (const f of r.fails) console.log(`       ${f}`);
  if (r.fails.length) failed++;
}
if (failed) {
  console.error(`\naudit:theme — ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\naudit:theme — all checks passed");
