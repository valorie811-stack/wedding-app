"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { inScope } from "@/lib/dashboard";
import { formatAUD, formatMoney, pct } from "@/lib/format";
import { WEDDINGS, WEDDING_LIST } from "@/lib/theme";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const PLANNED_COLOR = "#cbd5e1"; // ink-300
const ACTUAL_COLOR = "#14b8a6"; // kk-500

export default function FinanceView({ categories, items, rates, fxLive, preview }) {
  const { t, scope, locale } = useApp();
  const toAUD = (amount, currency) => (Number(amount) || 0) * (rates?.[currency] ?? 0);

  const visibleCats = useMemo(() => categories.filter((c) => inScope(c.code, scope)), [categories, scope]);
  const visibleItems = useMemo(() => items.filter((i) => inScope(i.code, scope)), [items, scope]);

  // Per-wedding totals (local + AUD).
  const perWedding = useMemo(
    () =>
      WEDDING_LIST.filter((w) => inScope(w.code, scope)).map((w) => {
        const cats = visibleCats.filter((c) => c.code === w.code);
        const its = visibleItems.filter((i) => i.code === w.code);
        const plannedLocal = cats.reduce((s, c) => s + Number(c.planned), 0);
        const actualLocal = its.reduce((s, i) => s + Number(i.actual), 0);
        return {
          wedding: w,
          plannedLocal,
          actualLocal,
          planned: Math.round(toAUD(plannedLocal, w.currency)),
          actual: Math.round(toAUD(actualLocal, w.currency)),
        };
      }),
    [visibleCats, visibleItems, scope, rates] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Budget vs actual by category (combined across weddings, in AUD).
  const byCategory = useMemo(() => {
    const map = new Map();
    visibleCats.forEach((c) => {
      const cur = map.get(c.category) || { name: c.category, planned: 0, actual: 0 };
      cur.planned += toAUD(c.planned, c.currency);
      map.set(c.category, cur);
    });
    visibleItems.forEach((i) => {
      const cur = map.get(i.category) || { name: i.category, planned: 0, actual: 0 };
      cur.actual += toAUD(i.actual, i.currency);
      map.set(i.category, cur);
    });
    return [...map.values()]
      .map((r) => ({ name: r.name, planned: Math.round(r.planned), actual: Math.round(r.actual) }))
      .sort((a, b) => b.planned - a.planned);
  }, [visibleCats, visibleItems, rates]); // eslint-disable-line react-hooks/exhaustive-deps

  const byWedding = useMemo(
    () =>
      perWedding.map((p) => ({
        name: `${p.wedding.flag} ${p.wedding.city[locale] || p.wedding.city.en}`,
        planned: p.planned,
        actual: p.actual,
      })),
    [perWedding, locale]
  );

  const totalPlanned = perWedding.reduce((s, p) => s + p.planned, 0);
  const totalActual = perWedding.reduce((s, p) => s + p.actual, 0);
  const usedPct = pct(totalActual, totalPlanned);

  const fxAsOf = rates
    ? `1 AUD ≈ ${Math.round(1 / (rates.VND || 1)).toLocaleString()} VND · ${(1 / (rates.MYR || 1)).toFixed(2)} MYR`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{t("finance.title")}</h1>
          <p className="mt-0.5 text-sm text-ink-500">{t("finance.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber">⚠️ {t("common.preview")}</Badge>}
          <Badge tone={fxLive ? "green" : "neutral"}>
            {fxLive ? `🟢 ${t("finance.liveRates")}` : `🔒 ${t("finance.staticRates")}`}
          </Badge>
          <Button as="a" href={`/api/pdf/budget?scope=${scope}`} target="_blank" rel="noopener" variant="outline">
            ⬇ PDF
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("finance.totalPlanned")} value={formatAUD(totalPlanned)} tone="ink" />
        <Stat label={t("finance.totalActual")} value={formatAUD(totalActual)} tone="kk" />
        <Stat label={t("finance.remaining")} value={formatAUD(Math.max(0, totalPlanned - totalActual))} tone="gold" />
        <Stat label={t("finance.used")} value={`${usedPct}%`} tone="hp" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("finance.byWedding")} subtitle={t("finance.inAUD")} />
          <CardBody>
            <ChartBlock data={byWedding} t={t} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("finance.byCategory")} subtitle={t("finance.inAUD")} />
          <CardBody>
            <ChartBlock data={byCategory} t={t} angled />
          </CardBody>
        </Card>
      </div>

      {/* Per-wedding local breakdown */}
      <Card>
        <CardHeader title={t("finance.breakdown")} subtitle={fxAsOf} />
        <CardBody className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2">{t("common.wedding")}</th>
                  <th className="py-2 text-right">{t("finance.plannedLocal")}</th>
                  <th className="py-2 text-right">{t("finance.actualLocal")}</th>
                  <th className="py-2 text-right">{t("finance.plannedAUD")}</th>
                  <th className="py-2 text-right">{t("finance.actualAUD")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {perWedding.map((p) => (
                  <tr key={p.wedding.code}>
                    <td className="py-2">
                      <span className="mr-1">{p.wedding.flag}</span>
                      {p.wedding.city[locale] || p.wedding.city.en}
                      <Badge tone={p.wedding.code === "HP" ? "hp" : "kk"} className="ml-2">{p.wedding.code}</Badge>
                    </td>
                    <td className="py-2 text-right text-ink-600">{formatMoney(p.plannedLocal, p.wedding.currency)}</td>
                    <td className="py-2 text-right text-ink-600">{formatMoney(p.actualLocal, p.wedding.currency)}</td>
                    <td className="py-2 text-right text-ink-800">{formatAUD(p.planned)}</td>
                    <td className="py-2 text-right font-medium text-kk-700">{formatAUD(p.actual)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">{t("common.total")}</td>
                  <td className="py-2" />
                  <td className="py-2" />
                  <td className="py-2 text-right">{formatAUD(totalPlanned)}</td>
                  <td className="py-2 text-right text-kk-700">{formatAUD(totalActual)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ChartBlock({ data, t, angled }) {
  if (!data.length) {
    return <p className="py-12 text-center text-sm text-ink-400">{t("finance.noData")}</p>;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: angled ? 40 : 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval={0}
            angle={angled ? -30 : 0}
            textAnchor={angled ? "end" : "middle"}
            height={angled ? 50 : 30}
          />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={44} />
          <Tooltip formatter={(v) => formatAUD(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="planned" name={t("finance.planned")} fill={PLANNED_COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" name={t("finance.actual")} fill={ACTUAL_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, tone = "ink" }) {
  const color =
    tone === "kk" ? "text-kk-700" : tone === "hp" ? "text-hp-700" : tone === "gold" ? "text-gold-700" : "text-ink-900";
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <p className={`mt-1 font-serif text-2xl font-semibold ${color}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
