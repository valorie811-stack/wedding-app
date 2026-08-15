#!/usr/bin/env node
/**
 * Node port of scripts/build-icons.py — regenerates components/ui/Icon.jsx.
 *
 * Exists because the toolchain here has no Python interpreter. build-icons.py
 * remains the reference implementation; this file must stay behaviourally
 * identical to it. `npm run icons:verify` regenerates and diffs against the
 * committed Icon.jsx, so any drift between the two fails loudly.
 *
 * The tremor is seeded, so reproducing it means reproducing CPython's RNG
 * bit-for-bit: MT19937 seeded via init_by_array (what random.Random(int) does)
 * and genrand_res53 for random(). Everything downstream is ordinary float
 * maths, but the *order* of rng draws matters and is preserved exactly.
 *
 * Usage:  node scripts/build-icons.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "components", "ui", "Icon.jsx");

/* ── CPython's Mersenne Twister ─────────────────────────────────────────── */
const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER = 0x80000000;
const LOWER = 0x7fffffff;

class PyRandom {
  constructor(seed) {
    this.mt = new Uint32Array(N);
    this.mti = N + 1;
    // random.Random(int) uses abs(seed) split into little-endian 32-bit words.
    let n = typeof seed === "bigint" ? (seed < 0n ? -seed : seed) : BigInt(Math.abs(seed));
    const key = [];
    if (n === 0n) key.push(0);
    while (n > 0n) {
      key.push(Number(n & 0xffffffffn));
      n >>= 32n;
    }
    this.initByArray(key);
  }

  initGenrand(s) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = N;
  }

  initByArray(key) {
    this.initGenrand(19650218);
    const mt = this.mt;
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, key.length); k; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (((mt[i] ^ Math.imul(prev, 1664525)) >>> 0) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (((mt[i] ^ Math.imul(prev, 1566083941)) >>> 0) - i) >>> 0;
      i++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    }
    mt[0] = UPPER;
  }

  genrandUint32() {
    const mt = this.mt;
    if (this.mti >= N) {
      let kk = 0;
      for (; kk < N - M; kk++) {
        const y = ((mt[kk] & UPPER) | (mt[kk + 1] & LOWER)) >>> 0;
        mt[kk] = (mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
      }
      for (; kk < N - 1; kk++) {
        const y = ((mt[kk] & UPPER) | (mt[kk + 1] & LOWER)) >>> 0;
        mt[kk] = (mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
      }
      const y = ((mt[N - 1] & UPPER) | (mt[0] & LOWER)) >>> 0;
      mt[N - 1] = (mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y = (y ^ (y >>> 11)) >>> 0;
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
    y = (y ^ (y >>> 18)) >>> 0;
    return y >>> 0;
  }

  /** genrand_res53 — exactly what CPython's random.random() returns. */
  random() {
    const a = this.genrandUint32() >>> 5;
    const b = this.genrandUint32() >>> 6;
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  }

  uniform(a, b) {
    return a + (b - a) * this.random();
  }
}

/* ── geometry helpers (1:1 with the Python) ─────────────────────────────── */
const rad = (d) => (d * Math.PI) / 180;

const circle = (cx, cy, r, n = 48) =>
  Array.from({ length: n + 1 }, (_, i) => [
    cx + r * Math.cos((2 * Math.PI * i) / n),
    cy + r * Math.sin((2 * Math.PI * i) / n),
  ]);

const arc = (cx, cy, r, a0deg, a1deg, n = 24) => {
  const a0 = rad(a0deg), a1 = rad(a1deg);
  return Array.from({ length: n + 1 }, (_, i) => [
    cx + r * Math.cos(a0 + ((a1 - a0) * i) / n),
    cy + r * Math.sin(a0 + ((a1 - a0) * i) / n),
  ]);
};

function rect(x, y, w, h, r = 0) {
  if (r <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  const pts = [
    ...arc(x + w - r, y + r, r, -90, 0),
    ...arc(x + w - r, y + h - r, r, 0, 90),
    ...arc(x + r, y + h - r, r, 90, 180),
    ...arc(x + r, y + r, r, 180, 270),
  ];
  pts.push(pts[0]);
  return pts;
}

function rotRect(cx, cy, w, h, ang, r = 0.5) {
  const pts = rect(-w / 2, -h / 2, w, h, r);
  const a = rad(ang);
  return pts.map(([x, y]) => [
    cx + x * Math.cos(a) - y * Math.sin(a),
    cy + x * Math.sin(a) + y * Math.cos(a),
  ]);
}

const line = (...pts) => pts;

/* ── roughening ─────────────────────────────────────────────────────────── */
function resample(pts, step = 1.1) {
  const out = [pts[0]];
  let carry = 0.0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy);
    if (d < 1e-9) continue;
    let t = carry;
    while (t + step <= d) {
      t += step;
      out.push([a[0] + (dx * t) / d, a[1] + (dy * t) / d]);
    }
    carry = t - d;
  }
  const last = out[out.length - 1], end = pts[pts.length - 1];
  if (!(last[0] === end[0] && last[1] === end[1])) out.push(end);
  return out;
}

function smoothNoise(n, rng, octaves = [4, 9], amp = [1.0, 0.45]) {
  const out = new Array(n).fill(0.0);
  for (let k = 0; k < octaves.length; k++) {
    const period = octaves[k], a = amp[k];
    const ph = rng.uniform(0, 2 * Math.PI);
    const f = rng.uniform(0.85, 1.15);
    for (let i = 0; i < n; i++) {
      out[i] += a * Math.sin(ph + (2 * Math.PI * f * i) / period);
    }
  }
  return out;
}

function roughen(pts, rng, amount = 0.16, step = 1.1) {
  pts = resample(pts, step);
  const n = pts.length;
  // Order matters: nx is drawn before ny.
  const nx = smoothNoise(n, rng);
  const ny = smoothNoise(n, rng);
  const closed =
    Math.abs(pts[0][0] - pts[n - 1][0]) < 1e-6 && Math.abs(pts[0][1] - pts[n - 1][1]) < 1e-6;
  const out = pts.map(([x, y], i) => {
    const t = closed ? 1.0 : Math.min(1.0, Math.min(i, n - 1 - i) / Math.max(1.0, n * 0.18));
    return [x + nx[i] * amount * t, y + ny[i] * amount * t];
  });
  if (closed) out[n - 1] = out[0];
  return out;
}

/** Python's f"{v:.2f}".rstrip("0").rstrip(".") — including its -0 sign. */
function fmt(v, prec = 2) {
  let s = v.toFixed(prec);
  if ((v < 0 || Object.is(v, -0)) && s[0] !== "-") s = "-" + s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

const toPath = (pts) =>
  `M${fmt(pts[0][0])} ${fmt(pts[0][1])}` +
  pts.slice(1).map(([x, y]) => `L${fmt(x)} ${fmt(y)}`).join("");

const render = (subpaths, seed, amount = 0.16) => {
  const rng = new PyRandom(seed);
  return subpaths.map((sp) => toPath(roughen(sp, rng, amount))).join("");
};

/* ── the 13 modules ─────────────────────────────────────────────────────── */
const I = {};
I.dashboard = [line([3, 10.5], [12, 3.5], [21, 10.5]),
               line([5.2, 9.2], [5.2, 20], [18.8, 20], [18.8, 9.2]),
               rect(10, 14, 4, 6)];
I.scheduler = [rect(3, 5, 18, 16, 1.6), line([3, 9.5], [21, 9.5]),
               line([7.5, 3], [7.5, 6.5]), line([16.5, 3], [16.5, 6.5]),
               line([6.5, 13], [13, 13]), line([6.5, 16.5], [17, 16.5])];
I.planning = [rect(4.5, 4, 15, 17, 1.6), rect(9, 2.2, 6, 3.4, 0.8),
              line([8, 11], [9.5, 12.5], [12.5, 9.2]),
              line([8, 16], [9.5, 17.5], [12.5, 14.2]),
              line([14.5, 11.6], [16.5, 11.6]), line([14.5, 16.6], [16.5, 16.6])];
I.guests = [circle(9, 8.2, 3.1), arc(9, 17.4, 5.4, 180, 360),
            circle(16.6, 9.2, 2.4), arc(16.6, 17.4, 4.2, 200, 340)];
I.rsvp = [rect(3, 5.5, 18, 13, 1.4), line([3.6, 6.4], [12, 13], [20.4, 6.4]),
          line([3.8, 17.6], [9.6, 12.2]), line([20.2, 17.6], [14.4, 12.2])];
// a place setting reads as "seating" far better than a top-down table
I.tables = [circle(12, 12, 5.2), circle(12, 12, 3.2),
            line([4.2, 5.2], [4.2, 9.4]), line([6.2, 5.2], [6.2, 9.4]),
            line([5.2, 5.2], [5.2, 9.4]), line([5.2, 9.4], [5.2, 19.2]),
            line([19, 5.2], [19, 19.2]),
            line([19, 5.2], [17.4, 7.2], [17.4, 10.4], [19, 11.4])];
I.vendors = [line([3, 9], [4.6, 4.6], [19.4, 4.6], [21, 9]), line([3, 9], [21, 9]),
             line([4.8, 9], [4.8, 20], [19.2, 20], [19.2, 9]), rect(8.6, 13, 6.8, 7)];
I.budget = [line([6.4, 8], [8.6, 4.2], [15.4, 4.2], [17.6, 8]),
            rect(3.6, 8, 16.8, 12, 2.2), circle(12, 14, 2.5)];
I.finance = [line([3.5, 20.5], [20.5, 20.5]), line([6.5, 20.5], [6.5, 14]),
             line([11, 20.5], [11, 9.5]), line([15.5, 20.5], [15.5, 16]),
             line([20, 20.5], [20, 6])];
I.moodboards = [rect(3, 5, 18, 14, 1.4), line([3.6, 15.4], [8.8, 10.4], [13, 14.4]),
                line([13, 14.4], [16.2, 11.4], [20.4, 15.4]), circle(16.4, 8.6, 1.4)];
// a hanger, not a dress: unambiguous down to 16px
I.attire = [arc(12, 5.4, 1.6, -155, -25), line([12, 7], [12, 8.6]),
            line([12, 8.6], [4.2, 15.2]), line([12, 8.6], [19.8, 15.2]),
            line([4.2, 15.2], [19.8, 15.2]), arc(12, 15.2, 7.8, 15, 165)];
I.traditions = [line([12, 6.4], [12, 19.6]),
                line([12, 6.4], [6, 4.6], [3.2, 5.6], [3.2, 18], [6, 17], [12, 19.6]),
                line([12, 6.4], [18, 4.6], [20.8, 5.6], [20.8, 18], [18, 17], [12, 19.6])];
I.settings = [circle(12, 12, 3.1)]
  .concat(
    Array.from({ length: 8 }, (_, k) => k * 45).map((a) =>
      line(
        [12 + 4.9 * Math.cos(rad(a)), 12 + 4.9 * Math.sin(rad(a))],
        [12 + 7.4 * Math.cos(rad(a)), 12 + 7.4 * Math.sin(rad(a))]
      )
    )
  )
  .concat([circle(12, 12, 5.0)]);

/* ── traditions cards (lib/traditions.js) ───────────────────────────────── */
// Drawn rather than reused from the module set: these illustrate ceremonies,
// not navigation. arc() sweeps a0 -> a1 linearly, where 0=right, 90=down,
// 180=left, 270=up — so a cup floor is 180 -> 0 and a dome is 180 -> 360.
I.redEnvelope = [rect(6.2, 2.8, 11.6, 18.4, 1.8),
                 line([6.2, 4.4], [8.6, 7.6], [12, 8.8], [15.4, 7.6], [17.8, 4.4]),
                 circle(12, 14.4, 2.6), circle(12, 14.4, 0.9)];
I.tea = [[...line([5.8, 10.6], [6.8, 14.6]), ...arc(12, 14.6, 5.2, 180, 0), ...line([17.2, 14.6], [18.2, 10.6])],
         line([4.6, 10.6], [19.4, 10.6]), arc(18.4, 12.4, 2.4, -66, 66),
         line([3.4, 19.6], [20.6, 19.6]),
         line([9.4, 8.2], [10.3, 6.6], [9.4, 5]), line([13.4, 8.2], [14.3, 6.6], [13.4, 5])];
// mâm quả, the covered offering tray carried at Lễ Ăn Hỏi, not a wrapped present
I.giftTray = [arc(12, 14.6, 7, 180, 360), line([12, 7.6], [12, 6]), circle(12, 5, 1.1),
              line([3.4, 14.6], [20.6, 14.6]), line([6, 14.6], [7, 18], [17, 18], [18, 14.6]),
              line([9, 18], [9, 20.2]), line([15, 18], [15, 20.2]),
              line([7.4, 20.2], [16.6, 20.2])];
// a chapel reads as the wrong tradition entirely, so Lễ Cưới gets rings
I.rings = [circle(8.9, 14.2, 4.9), circle(15.1, 14.2, 4.9),
           line([8.9, 9.3], [7.7, 6.6], [10.1, 6.6], [8.9, 9.3])];

/* ── brand mark ─────────────────────────────────────────────────────────── */
// 喜 for the sidebar, where 囍 is unreadable at 20px. Drawn here rather than
// hand-authored as public/mark.svg, which carried a runtime feTurbulence +
// feDisplacementMap filter — the exact thing the tremor is baked to avoid.
// Structure, top to bottom: 士 (long bar, stem, shorter bar), 口, 丷, 一, 口.
// Proportioned square; the hand-authored version was 188x262 and read stretched.
// MUST stay last in I: default seeds are 1000 + insertion index * 37, so
// inserting earlier would re-roll every icon after it.
I.mark = [line([4.2, 3], [19.8, 3]),
          line([12, 3], [12, 5.8]),
          line([6.6, 5.8], [17.4, 5.8]),
          rect(7, 7.3, 10, 3.3),
          line([9.5, 11.9], [8, 13.7]),
          line([14.5, 11.9], [16, 13.7]),
          line([3, 15.1], [21, 15.1]),
          rect(5.3, 16.9, 13.4, 4.1)];

const SEEDS = { tables: 777, attire: 5150, redEnvelope: 8101, tea: 8207, giftTray: 8311, rings: 8419,
                mark: 9001 };
const ORDER = ["dashboard", "scheduler", "planning", "guests", "rsvp", "tables", "vendors",
               "budget", "finance", "moodboards", "attire", "traditions", "settings",
               "redEnvelope", "tea", "giftTray", "rings", "mark"];

/* ── emit ───────────────────────────────────────────────────────────────── */
function build() {
  const insertion = Object.keys(I);
  const paths = {};
  for (const k of ORDER) {
    const seed = k in SEEDS ? SEEDS[k] : 1000 + insertion.indexOf(k) * 37;
    paths[k] = render(I[k], seed, 0.17);
  }
  const body = ORDER.map((k) => `  ${k}:\n    "${paths[k]}",`).join("\n");
  return `// Hand-drawn module icons, matching the line style of the reference set.
//
// The tremor is baked into the path data at design time rather than applied at
// runtime with an SVG turbulence filter. A filter would have to re-run on every
// nav repaint for all 13 icons, which is exactly the kind of cost the recent
// nav performance work removed.
//
// Regenerate with scripts/build-icons.py.

const PATHS = {
${body}
};

export const ICON_NAMES = Object.keys(PATHS);

/**
 * @param {object} props
 * @param {string} props.name   key from PATHS
 * @param {number} [props.size] px, defaults to 20
 * @param {string} [props.className]
 */
export default function Icon({ name, size = 20, className = "", ...rest }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
`;
}

const src = build();
if (process.argv.includes("--check")) {
  const current = fs.readFileSync(OUT, "utf8");
  if (current === src) {
    console.log(`icons:verify — Icon.jsx reproduces byte-for-byte (${src.length} bytes, ${ORDER.length} icons)`);
  } else {
    console.error("icons:verify — MISMATCH: generated output differs from committed Icon.jsx");
    console.error(`  committed ${current.length} bytes, generated ${src.length} bytes`);
    for (let i = 0; i < Math.min(current.length, src.length); i++) {
      if (current[i] !== src[i]) {
        console.error(`  first difference at byte ${i}:`);
        console.error(`    committed: ${JSON.stringify(current.slice(i - 40 < 0 ? 0 : i - 40, i + 40))}`);
        console.error(`    generated: ${JSON.stringify(src.slice(i - 40 < 0 ? 0 : i - 40, i + 40))}`);
        break;
      }
    }
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, src, "utf8");
  console.log(`wrote ${OUT} (${src.length} bytes, ${ORDER.length} icons)`);
}
