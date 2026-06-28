"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";

const COLORS = { confirmed: "#0d9488", pending: "#fbbf24", declined: "#e11d48" };

export default function RsvpDonut({ confirmed = 0, pending = 0, declined = 0 }) {
  const { t } = useApp();
  const total = confirmed + pending + declined;
  const data = [
    { key: "confirmed", label: t("dashboard.confirmed"), value: confirmed },
    { key: "pending", label: t("dashboard.pending"), value: pending },
    { key: "declined", label: t("dashboard.declined"), value: declined },
  ];

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total ? data : [{ key: "empty", value: 1 }]}
              dataKey="value"
              innerRadius={48}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {(total ? data : [{ key: "empty" }]).map((d) => (
                <Cell key={d.key} fill={total ? COLORS[d.key] : "#e2e8f0"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink-900">{confirmed}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-400">
            {t("dashboard.confirmed")}
          </span>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[d.key] }} />
            <span className="text-ink-600">{d.label}</span>
            <span className="ml-auto font-semibold text-ink-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
