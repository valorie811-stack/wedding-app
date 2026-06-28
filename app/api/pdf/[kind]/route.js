import { getCalendarData, getBudgetData } from "@/lib/data";
import { getRates } from "@/lib/fx";
import { WEDDINGS, WEDDING_LIST } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inScope = (code, scope) => scope === "BOTH" || code === scope;

export async function GET(req, { params }) {
  const { kind } = await params;
  const scope = new URL(req.url).searchParams.get("scope") || "BOTH";
  const generatedAt = new Date().toLocaleString("en-GB");

  // Load the heavy PDF renderer lazily so it's only pulled when a PDF is
  // requested. Degrade gracefully if the optional dependency is unavailable.
  let renderToBuffer, RunSheetDoc, BudgetDoc;
  try {
    ({ renderToBuffer } = await import("@react-pdf/renderer"));
    ({ RunSheetDoc, BudgetDoc } = await import("@/lib/pdf/documents"));
  } catch {
    return new Response("PDF generation is not available on this deployment.", { status: 503 });
  }

  let element;
  let filename;

  if (kind === "runsheet") {
    const { events, tasks } = await getCalendarData();
    element = await RunSheetDoc({ events, tasks, scope, generatedAt });
    filename = "run-sheet.pdf";
  } else if (kind === "budget") {
    const [{ categories, items }, fx] = await Promise.all([getBudgetData(), getRates()]);
    const rates = fx.rates || {};
    const weddings = WEDDING_LIST.map((w) => w.code)
      .filter((code) => inScope(code, scope))
      .map((code) => {
        const w = WEDDINGS[code];
        const cats = categories
          .filter((c) => c.code === code)
          .map((c) => ({
            category: c.category,
            planned: Number(c.planned),
            actual: items
              .filter((i) => i.code === code && i.category === c.category)
              .reduce((sum, i) => sum + Number(i.actual), 0),
          }));
        const plannedLocal = cats.reduce((s, c) => s + c.planned, 0);
        const actualLocal = cats.reduce((s, c) => s + c.actual, 0);
        return { code, city: w.city.en, currency: w.currency, cats, plannedLocal, actualLocal };
      })
      .filter((w) => w.cats.length);

    const totals = weddings.reduce(
      (acc, w) => {
        acc.plannedAUD += w.plannedLocal * (rates[w.currency] ?? 0);
        acc.actualAUD += w.actualLocal * (rates[w.currency] ?? 0);
        return acc;
      },
      { plannedAUD: 0, actualAUD: 0 }
    );

    element = await BudgetDoc({ weddings, totals, generatedAt });
    filename = "budget-snapshot.pdf";
  } else {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await renderToBuffer(element);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
