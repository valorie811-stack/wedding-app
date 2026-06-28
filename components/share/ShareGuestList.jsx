import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

function chipClass(status) {
  return status === "confirmed"
    ? "bg-emerald-100 text-emerald-700"
    : status === "declined"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
}

// Read-only guest list. Contacts are intentionally omitted from the public view.
export default function ShareGuestList({ data, t, locale }) {
  const guests = data.guests || [];
  const eventName = (inv) => {
    const ev = (data.events || []).find((e) => e.id === inv.event_id);
    return ev?.name?.[locale] || ev?.name?.en || inv.code;
  };

  const confirmed = guests.reduce(
    (n, g) => n + g.invites.filter((i) => i.status === "confirmed").length,
    0
  );

  if (guests.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="py-8 text-center text-sm text-ink-400">{t("sharePage.empty")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm text-ink-600">
        <Badge tone="neutral">{guests.length} {t("guests.title")}</Badge>
        <Badge tone="green">{confirmed} {t("rsvp.confirmed")}</Badge>
      </div>
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-ink-100">
            {guests.map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="font-medium text-ink-900">{g.full_name}</span>
                <Badge tone="neutral">{t(`guests.sides.${g.side}`)}</Badge>
                {g.plus_one && <Badge tone="gold">+1</Badge>}
                {(g.dietary || []).map((d) => (
                  <Badge key={d} tone="kk">{t(`guests.diet.${d}`)}</Badge>
                ))}
                <span className="ml-auto flex flex-wrap justify-end gap-1">
                  {g.invites.map((inv, j) => (
                    <span
                      key={j}
                      title={`${eventName(inv)}: ${t(`rsvp.status.${inv.status}`)}`}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${chipClass(inv.status)}`}
                    >
                      {inv.code}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
