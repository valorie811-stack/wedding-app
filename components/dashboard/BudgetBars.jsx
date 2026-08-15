"use client";

import { formatAUD } from "@/lib/format";

// Planned vs actual per category, normalised to the largest planned value.
export default function BudgetBars({ byCategory = [] }) {
  const max = Math.max(1, ...byCategory.map((c) => c.planned));

  if (!byCategory.length) {
    return <p className="text-sm text-stone-400">—</p>;
  }

  return (
    <ul className="space-y-3.5">
      {byCategory.map((c) => {
        const over = c.actual > c.planned;
        return (
          <li key={c.category}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-stone-700">{c.category}</span>
              <span className={over ? "text-red-600" : "text-stone-500"}>
                {formatAUD(c.actual)} <span className="text-stone-400">/ {formatAUD(c.planned)}</span>
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
              {/* planned track */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-stone-200"
                style={{ width: `${(c.planned / max) * 100}%` }}
              />
              {/* actual fill */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  over ? "bg-red-500" : "bg-kk-500"
                }`}
                style={{ width: `${(Math.min(c.actual, max) / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
