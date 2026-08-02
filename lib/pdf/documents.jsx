// PDF documents for branded run sheet + budget snapshot, using
// @react-pdf/renderer. Rendered server-side via renderToBuffer in the API route.
// NOTE: Vietnamese text (e.g. "Hải Phòng", "mâm quả") requires a Unicode font.
// @react-pdf's built-in Helvetica is a standard PDF font limited to WinAnsi/Latin-1
// and has no Vietnamese glyphs, so we register a bundled Noto Sans subset (Latin +
// Vietnamese) below. Chinese (ZH) is still unsupported — that would need a CJK font.
//
// The renderer primitives are imported lazily (await import) inside each builder so
// the heavy @react-pdf/renderer lib is only loaded when a PDF is actually requested —
// matching how resend / qr / xlsx are loaded on demand elsewhere in the app.

// @react-pdf/renderer takes plain hex in its StyleSheet objects, so colour is
// pulled from the shared token module rather than written by hand here.
import tokens from "@/lib/tokens";

const C = {
  ink: tokens.stone[900],
  sub: tokens.stone[600],
  line: tokens.stone[200],
  gold: tokens.gold[600],
  kk: tokens.kk[600],
  hp: tokens.hp[600],
  matcha: tokens.matcha[600],
};

// Font family used for all PDF text. Registered once per process from bundled TTFs.
const FONT = "Noto Sans";
let fontsRegistered = false;

// Register the bundled Noto Sans subset (Regular 400 + Bold 700) with @react-pdf.
// Fonts are read from disk as base64 data URLs so registration never depends on
// react-pdf resolving a runtime path. The files live at lib/pdf/fonts/ and are
// force-included in the serverless bundle via outputFileTracingIncludes (next.config).
async function ensureFonts(Font) {
  if (fontsRegistered) return;
  const [{ default: fs }, { default: path }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);
  const dir = path.join(process.cwd(), "lib", "pdf", "fonts");
  const dataUrl = (file) =>
    `data:font/ttf;base64,${fs.readFileSync(path.join(dir, file)).toString("base64")}`;
  Font.register({
    family: FONT,
    fonts: [
      { src: dataUrl("NotoSans-Regular.ttf"), fontWeight: 400 },
      { src: dataUrl("NotoSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Vietnamese words must never be broken across lines by the hyphenation engine.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

function buildStyles(StyleSheet) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, color: C.ink, fontFamily: FONT },
    brand: { fontSize: 9, color: C.gold, marginBottom: 2, letterSpacing: 1 },
    h1: { fontSize: 20, marginBottom: 2 },
    sub: { fontSize: 10, color: C.sub, marginBottom: 18 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 12, marginBottom: 6, color: C.ink },
    dateTitle: { fontSize: 11, marginBottom: 4, color: C.kk },
    headRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.ink, paddingBottom: 3, marginBottom: 2 },
    row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4 },
    th: { fontSize: 8, color: C.sub, textTransform: "uppercase" },
    time: { width: 90 },
    grow: { flex: 1 },
    loc: { flex: 1, color: C.sub },
    code: { width: 32, textAlign: "right", color: C.sub },
    num: { width: 90, textAlign: "right" },
    totalRow: { flexDirection: "row", paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: C.ink },
    bold: { fontFamily: FONT, fontWeight: 700 },
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: C.sub, textAlign: "center" },
  });
}

function fmtDate(d) {
  try {
    return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
  } catch {
    return d;
  }
}
const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
const money = (n, cur) => {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `${n} ${cur}`;
  }
};

export async function RunSheetDoc({ events = [], tasks = [], scope = "BOTH", generatedAt }) {
  const { Document, Page, View, Text, StyleSheet, Font } = await import("@react-pdf/renderer");
  await ensureFonts(Font);
  const s = buildStyles(StyleSheet);

  const inScope = (code) => scope === "BOTH" || code === scope;
  const evs = events
    .filter((e) => inScope(e.code) && e.date)
    .sort((a, b) => String(a.date).localeCompare(b.date) || String(a.start || "").localeCompare(String(b.start || "")));

  const groups = [];
  let cur = null;
  for (const e of evs) {
    if (!cur || cur.date !== e.date) {
      cur = { date: e.date, items: [] };
      groups.push(cur);
    }
    cur.items.push(e);
  }

  const milestones = tasks
    .filter((t) => (t.code == null ? scope === "BOTH" : inScope(t.code)) && t.due && t.status !== "done")
    .sort((a, b) => String(a.due).localeCompare(b.due))
    .slice(0, 15);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>TWO WEDDINGS</Text>
        <Text style={s.h1}>Run Sheet</Text>
        <Text style={s.sub}>
          {scope === "BOTH" ? "Both weddings" : scope === "HP" ? "Hải Phòng, Vietnam" : "Kota Kinabalu, Malaysia"}
          {"  ·  "}Hải Phòng 8–10 Oct 2027  ·  Kota Kinabalu 16–17 Oct 2027
        </Text>

        {groups.map((g, gi) => (
          <View key={gi} style={s.section} wrap={false}>
            <Text style={s.dateTitle}>{fmtDate(g.date)}</Text>
            <View style={s.headRow}>
              <Text style={[s.th, s.time]}>Time</Text>
              <Text style={[s.th, s.grow]}>Event</Text>
              <Text style={[s.th, s.loc]}>Location</Text>
              <Text style={[s.th, s.code]}>W</Text>
            </View>
            {g.items.map((e, i) => (
              <View key={i} style={s.row}>
                <Text style={s.time}>{e.start ? `${hhmm(e.start)}${e.end ? `–${hhmm(e.end)}` : ""}` : "All day"}</Text>
                <Text style={s.grow}>{e.name?.en || ""}{e.halal ? "  (Halal)" : ""}</Text>
                <Text style={s.loc}>{e.location || ""}</Text>
                <Text style={s.code}>{e.code}</Text>
              </View>
            ))}
          </View>
        ))}

        {milestones.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Key milestones</Text>
            {milestones.map((t, i) => (
              <View key={i} style={s.row}>
                <Text style={s.time}>{fmtDate(t.due)}</Text>
                <Text style={s.grow}>{t.title}</Text>
                <Text style={s.code}>{t.code || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer} fixed>
          Generated {generatedAt || ""} · Two Weddings planner
        </Text>
      </Page>
    </Document>
  );
}

export async function BudgetDoc({ weddings = [], totals = {}, generatedAt }) {
  const { Document, Page, View, Text, StyleSheet, Font } = await import("@react-pdf/renderer");
  await ensureFonts(Font);
  const s = buildStyles(StyleSheet);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>TWO WEDDINGS</Text>
        <Text style={s.h1}>Budget Snapshot</Text>
        <Text style={s.sub}>Planned vs actual per category, with a combined AUD total.</Text>

        {weddings.map((w, wi) => (
          <View key={wi} style={s.section} wrap={false}>
            <Text style={s.dateTitle}>
              {w.city} ({w.code}) · {w.currency}
            </Text>
            <View style={s.headRow}>
              <Text style={[s.th, s.grow]}>Category</Text>
              <Text style={[s.th, s.num]}>Planned</Text>
              <Text style={[s.th, s.num]}>Actual</Text>
            </View>
            {w.cats.map((c, i) => (
              <View key={i} style={s.row}>
                <Text style={s.grow}>{c.category}</Text>
                <Text style={s.num}>{money(c.planned, w.currency)}</Text>
                <Text style={s.num}>{money(c.actual, w.currency)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={[s.grow, s.bold]}>Subtotal</Text>
              <Text style={[s.num, s.bold]}>{money(w.plannedLocal, w.currency)}</Text>
              <Text style={[s.num, s.bold]}>{money(w.actualLocal, w.currency)}</Text>
            </View>
          </View>
        ))}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Combined total (AUD)</Text>
          <View style={s.totalRow}>
            <Text style={[s.grow, s.bold]}>Planned {money(totals.plannedAUD, "AUD")}</Text>
            <Text style={[s.grow, s.bold]}>Actual {money(totals.actualAUD, "AUD")}</Text>
            <Text style={[s.grow, s.bold]}>Remaining {money(Math.max(0, (totals.plannedAUD || 0) - (totals.actualAUD || 0)), "AUD")}</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Generated {generatedAt || ""} · Two Weddings planner
        </Text>
      </Page>
    </Document>
  );
}
