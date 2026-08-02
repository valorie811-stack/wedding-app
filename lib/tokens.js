// Single source of truth for the app's visual tokens.
//
// This file is deliberately plain CommonJS with zero imports so that it can be
// consumed by every layer that needs colour, including the ones that cannot use
// Tailwind classes:
//   - tailwind.config.js          (require, build time)
//   - app/**, components/**       (import, via webpack CJS interop)
//   - lib/theme.js                (per-wedding identity)
//   - lib/pdf/documents.jsx       (@react-pdf/renderer inline styles)
//   - lib/email.js, lib/digest.js (inline styles in HTML email)
//   - recharts / SVG chart fills
//
// Palette: "matcha" — extracted from the Matcha Home Notion template.
// Sage green is the app's chrome. The two weddings keep their split but are
// retuned earthy so they sit inside the matcha world: Hai Phong moves from
// crimson to terracotta, Kota Kinabalu moves from bright teal to a bluer sea
// teal that reads clearly distinct from the sage.

/** Warm neutral ramp — UI chrome, text, borders. Replaces the old cool `ink`. */
const stone = {
  50: "#FBFBFA",
  100: "#F1F1EF",
  200: "#E9E9E7",
  300: "#DFDEDB",
  400: "#B4B2AD",
  500: "#91908C",
  600: "#787774",
  700: "#5F5E5B",
  800: "#454440",
  900: "#37352F",
  950: "#201F1C",
};

/** Sage green — the app's own accent. 600 is the core value. */
const matcha = {
  50: "#F3F8F4",
  100: "#EDF3EC",
  200: "#D8E7DA",
  300: "#B4D0BA",
  400: "#86B394",
  500: "#5F9877",
  600: "#448361",
  700: "#366A4F",
  800: "#2C5340",
  900: "#263D30",
};

/** Hai Phong, Vietnam — terracotta. 600 is the core value. */
const hp = {
  50: "#FBF5F3",
  100: "#F5E7E3",
  200: "#EBCEC7",
  300: "#DCAC9F",
  400: "#C88371",
  500: "#BC6753",
  600: "#B0503D",
  700: "#8E3F30",
  800: "#6B2E22",
  900: "#4A1F17",
};

/** Kota Kinabalu, Malaysia — sea teal. 600 is the core value. */
const kk = {
  50: "#F2F8F9",
  100: "#E3EEF1",
  200: "#C4DBE1",
  300: "#9BC2CB",
  400: "#66A1AE",
  500: "#418494",
  600: "#2F6E7A",
  700: "#275A65",
  800: "#1C4249",
  900: "#142F34",
};

/** Muted brass — shared auspicious accent. 500 is the core value. */
const gold = {
  50: "#FAF7EF",
  100: "#F3ECDA",
  200: "#E6D8B4",
  300: "#D4BE85",
  400: "#C4A566",
  500: "#B4924C",
  600: "#94773C",
  700: "#6F5A2D",
};

/** Status colours, tuned to sit in the same muted register as the rest. */
const status = {
  success: matcha[600],
  successBg: matcha[100],
  warning: gold[600],
  warningBg: gold[100],
  danger: hp[600],
  dangerBg: hp[100],
  info: kk[600],
  infoBg: kk[100],
};

/** Semantic surfaces — what components should reach for by name. */
const surface = {
  page: stone[50],
  card: "#FFFFFF",
  sunken: stone[100],
  block: matcha[100],
  border: stone[200],
  borderStrong: stone[300],
};

const text = {
  primary: stone[900],
  secondary: stone[600],
  muted: stone[400],
  accent: matcha[600],
  onAccent: "#FFFFFF",
};

/**
 * Ordered series for charts. Colour follows the entity, never its rank, so
 * consumers should key off a stable name rather than an array index where
 * possible. `chartSeries` exists for the cases where an index is unavoidable.
 */
const chartSeries = [
  matcha[600],
  hp[600],
  kk[600],
  gold[500],
  matcha[400],
  hp[400],
  kk[400],
  gold[300],
];

const chartChrome = {
  grid: stone[200],
  axis: stone[300],
  tick: stone[500],
  label: stone[600],
  surface: "#FFFFFF",
};

/** Type stacks. Mono carries the chrome, sans carries user content. */
const font = {
  // Nav, labels, numerals, dates, table headers — the template's signature.
  mono: '"IBM Plex Mono", "iA Writer Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  // Guest names, notes, free text — must survive Vietnamese and Chinese.
  sans: '"Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
};

const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
};

module.exports = {
  stone,
  matcha,
  hp,
  kk,
  gold,
  status,
  surface,
  text,
  chartSeries,
  chartChrome,
  font,
  radius,
};
