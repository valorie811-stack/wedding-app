"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { pct } from "@/lib/format";
import { isFamilyOnlyEvent } from "@/lib/events";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { setInvite, removeInvite } from "@/app/(app)/guests/actions";
import Icon from "@/components/ui/Icon";

const CYCLE = ["confirmed", "pending", "declined"];
const SYMBOL = { confirmed: "✓", pending: "?", declined: "✕" };

function cellClass(status) {
  if (status === "confirmed") return "bg-emerald-500 text-white";
  if (status === "pending") return "bg-amber-400 text-stone-900";
  if (status === "declined") return "bg-red-500 text-white";
  return "border border-dashed border-stone-300 text-stone-300 hover:border-stone-400 hover:text-stone-500";
}

export default function RsvpView({ guests: initial, events, preview }) {
  const { t, scope, locale } = useApp();
  const [guests, setGuests] = useState(initial);

  // Columns = in-scope events, minus the family-only Lễ Dạm Ngõ (Family
  // Introduction), which is never a guest RSVP option.
  const cols = useMemo(() => {
    const scoped = scope === "BOTH" ? events : events.filter((e) => e.code === scope);
    return scoped.filter((e) => !isFamilyOnlyEvent(e));
  }, [events, scope]);

  // Rows: guests invited to at least one in-scope event, plus any guest with no
  // invites at all (so they can be invited). Keeps the matrix focused yet usable.
  const rows = useMemo(() => {
    const colIds = new Set(cols.map((c) => c.id));
    return guests.filter(
      (g) => g.invites.length === 0 || g.invites.some((i) => colIds.has(i.event_id))
    );
  }, [guests, cols]);

  const statusOf = (g, eventId) => g.invites.find((i) => i.event_id === eventId)?.status || null;

  // Per-event response summary.
  const summary = useMemo(() => {
    return cols.map((ev) => {
      const counts = { confirmed: 0, pending: 0, declined: 0 };
      guests.forEach((g) => {
        const s = statusOf(g, ev.id);
        if (s && counts[s] != null) counts[s] += 1;
      });
      const invited = counts.confirmed + counts.pending + counts.declined;
      return { ev, ...counts, invited, rate: pct(counts.confirmed + counts.declined, invited) };
    });
  }, [cols, guests]);

  function applyLocal(guestId, eventId, status) {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== guestId) return g;
        const code = events.find((e) => e.id === eventId)?.code;
        const exists = g.invites.some((i) => i.event_id === eventId);
        const invites = status === null
          ? g.invites.filter((i) => i.event_id !== eventId)
          : exists
            ? g.invites.map((i) => (i.event_id === eventId ? { ...i, status } : i))
            : [...g.invites, { event_id: eventId, code, status }];
        return { ...g, invites };
      })
    );
  }

  function cycle(g, eventId) {
    const cur = statusOf(g, eventId);
    const next = cur === null ? "pending" : CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    applyLocal(g.id, eventId, next);
    setInvite(g.id, eventId, next).catch(() => {});
  }

  function remove(g, eventId) {
    applyLocal(g.id, eventId, null);
    removeInvite(g.id, eventId).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("rsvp.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("rsvp.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber"><Icon name="warning" size={12} />{t("common.preview")}</Badge>}
        </div>
      </div>

      {/* Per-event summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summary.map(({ ev, confirmed, pending, declined, invited, rate }) => (
          <Card key={ev.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">{ev.name?.[locale] || ev.name?.en}</h3>
                <Badge tone={ev.code === "HP" ? "hp" : "kk"}>{ev.code}</Badge>
              </div>
              <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div className="h-full bg-emerald-500" style={{ width: `${barPct(confirmed, invited)}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${barPct(pending, invited)}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${barPct(declined, invited)}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                <Mini label={t("rsvp.confirmed")} value={confirmed} tone="text-emerald-700" />
                <Mini label={t("rsvp.pending")} value={pending} tone="text-amber-700" />
                <Mini label={t("rsvp.declined")} value={declined} tone="text-red-700" />
                <Mini label={t("rsvp.responseRate")} value={`${rate}%`} tone="text-stone-700" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Matrix */}
      <Card>
        <CardHeader title={t("rsvp.matrix")} subtitle={t("rsvp.clickHint")} />
        <CardBody className="pt-0">
          {cols.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">{t("rsvp.noEvents")}</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">{t("rsvp.noGuests")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-stone-500">
                    <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-medium">
                      {t("guests.title")}
                    </th>
                    {cols.map((ev) => (
                      <th key={ev.id} className="px-2 py-2 text-center font-medium">
                        <div className="flex flex-col items-center gap-1">
                          <Badge tone={ev.code === "HP" ? "hp" : "kk"}>{ev.code}</Badge>
                          <span className="max-w-[7rem] truncate text-[11px] text-stone-400" title={ev.name?.[locale] || ev.name?.en}>
                            {ev.name?.[locale] || ev.name?.en}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => (
                    <tr key={g.id} className="border-t border-stone-100">
                      <td className="sticky left-0 z-10 bg-white py-2 pr-3">
                        <span className="font-medium text-stone-800">{g.full_name}</span>
                      </td>
                      {cols.map((ev) => {
                        const s = statusOf(g, ev.id);
                        return (
                          <td key={ev.id} className="px-2 py-2 text-center">
                            <div className="group relative inline-block">
                              <button
                                onClick={() => cycle(g, ev.id)}
                                title={s ? t(`rsvp.status.${s}`) : t("rsvp.notInvited")}
                                className={`grid h-7 w-7 place-items-center rounded-md text-xs font-bold transition ${cellClass(s)}`}
                              >
                                {s ? SYMBOL[s] : "+"}
                              </button>
                              {s && (
                                <button
                                  onClick={() => remove(g, ev.id)}
                                  title={t("common.remove")}
                                  aria-label={t("common.remove")}
                                  className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 place-items-center rounded-full bg-stone-700 text-[9px] text-white group-hover:grid"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function barPct(part, whole) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function Mini({ label, value, tone }) {
  return (
    <div>
      <p className={`font-serif text-base font-semibold ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-stone-400">{label}</p>
    </div>
  );
}
