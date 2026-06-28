"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { aggregate } from "@/lib/dashboard";
import { formatAUD, pct } from "@/lib/format";
import { WEDDINGS } from "@/lib/theme";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import RsvpDonut from "@/components/dashboard/RsvpDonut";
import BudgetBars from "@/components/dashboard/BudgetBars";

function fmtDate(date, locale) {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export default function DashboardView({ source, preview }) {
  const { scope, t, locale } = useApp();
  const d = useMemo(() => aggregate(source, scope), [source, scope]);

  const budgetPct = pct(d.budget.actualAUD, d.budget.plannedAUD);
  const scopeLabel =
    scope === "BOTH" ? t("scope.both") : scope === "HP" ? t("scope.HP") : t("scope.KK");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{t("dashboard.title")}</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {t("scope.viewing")}: <span className="font-medium text-ink-700">{scopeLabel}</span>
          </p>
        </div>
        {preview && (
          <Badge tone="amber">⚠️ Preview data — connect Supabase for live figures</Badge>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon="✅"
          accent="kk"
          label={t("dashboard.guestsConfirmed")}
          value={d.rsvp.confirmed}
          sub={t("dashboard.ofInvited", { total: d.rsvp.total })}
        />
        <StatCard
          icon="💰"
          accent="gold"
          label={t("dashboard.budgetUsed")}
          value={`${budgetPct}%`}
          sub={t("dashboard.spentOf", {
            spent: formatAUD(d.budget.actualAUD),
            total: formatAUD(d.budget.plannedAUD),
          })}
        />
        <StatCard
          icon="📝"
          accent="hp"
          label={t("dashboard.tasksOpen")}
          value={d.tasks.count}
        />
        <StatCard
          icon="🎉"
          accent="ink"
          label={t("dashboard.nextEvents")}
          value={d.upcoming.length}
          sub={d.upcoming[0] ? d.upcoming[0].name?.[locale] || d.upcoming[0].name?.en : "—"}
        />
      </div>

      {/* RSVP + Budget */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dashboard.rsvpStatus")} subtitle={scopeLabel} />
          <CardBody>
            <RsvpDonut
              confirmed={d.rsvp.confirmed}
              pending={d.rsvp.pending}
              declined={d.rsvp.declined}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t("dashboard.budgetByCategory")}
            subtitle={t("dashboard.allWeddings")}
          />
          <CardBody>
            <BudgetBars byCategory={d.budget.byCategory} />
          </CardBody>
        </Card>
      </div>

      {/* Upcoming events + tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dashboard.nextEvents")} />
          <CardBody className="pt-0">
            <ul className="divide-y divide-ink-100">
              {d.upcoming.map((e, i) => {
                const w = WEDDINGS[e.code];
                return (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <span className="text-lg">{w?.flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {e.name?.[locale] || e.name?.en}
                      </p>
                      <p className="text-xs text-ink-500">{fmtDate(e.date, locale)}</p>
                    </div>
                    {e.halal && <Badge tone="green">Halal</Badge>}
                    <Badge tone={e.code === "HP" ? "hp" : "kk"}>{e.code}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("dashboard.upcomingTasks")} />
          <CardBody className="pt-0">
            {d.tasks.open.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">{t("dashboard.noTasks")}</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {d.tasks.open.map((task, i) => (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        task.status === "in_progress" ? "bg-gold-500" : "bg-ink-300"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-800">{task.title}</p>
                      <p className="text-xs text-ink-500">
                        {fmtDate(task.due, locale)}
                        {task.assignee ? ` · ${task.assignee}` : ""}
                      </p>
                    </div>
                    {task.code && (
                      <Badge tone={task.code === "HP" ? "hp" : "kk"}>{task.code}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
