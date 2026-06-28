import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

function fmtDate(dateStr, locale) {
  try {
    return new Intl.DateTimeFormat(
      locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB",
      { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    ).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// Read-only chronological run-of-events: ceremonies + task milestones by date.
export default function ShareSchedule({ data, t, locale }) {
  const items = [
    ...(data.events || []).map((e) => ({
      kind: "event",
      date: e.date,
      code: e.code,
      title: e.name?.[locale] || e.name?.en,
      start: e.start,
      end: e.end,
      location: e.location,
      halal: e.halal,
    })),
    ...(data.tasks || [])
      .filter((tk) => tk.due)
      .map((tk) => ({ kind: "milestone", date: tk.due, code: tk.code, title: tk.title, status: tk.status })),
  ]
    .filter((it) => it.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (items.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="py-8 text-center text-sm text-ink-400">{t("sharePage.empty")}</p>
        </CardBody>
      </Card>
    );
  }

  // Group by date.
  const groups = [];
  let cur = null;
  for (const it of items) {
    if (!cur || cur.date !== it.date) {
      cur = { date: it.date, items: [] };
      groups.push(cur);
    }
    cur.items.push(it);
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.date}>
          <p className="mb-2 text-sm font-semibold text-ink-700">{fmtDate(g.date, locale)}</p>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-ink-100">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        it.kind === "milestone" ? "bg-gold-500" : it.code === "HP" ? "bg-hp-500" : "bg-kk-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink-900">{it.title}</span>
                        {it.halal && <Badge tone="green">{t("vendors.halal")}</Badge>}
                        {it.kind === "milestone" && <Badge tone="gold">{t("calendar.milestone")}</Badge>}
                      </div>
                      <p className="text-xs text-ink-500">
                        {it.kind === "event"
                          ? `${it.start ? `${String(it.start).slice(0, 5)}${it.end ? `–${String(it.end).slice(0, 5)}` : ""}` : t("calendar.allDay")}${it.location ? ` · ${it.location}` : ""}`
                          : it.status
                            ? t(`planning.columns.${it.status}`)
                            : ""}
                      </p>
                    </div>
                    {it.code && <Badge tone={it.code === "HP" ? "hp" : "kk"}>{it.code}</Badge>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  );
}
