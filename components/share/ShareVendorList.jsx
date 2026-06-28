import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const STATUS_TONE = {
  enquiry: "neutral",
  quoted: "amber",
  booked: "kk",
  paid: "green",
  cancelled: "red",
};

// Read-only vendor directory (includes contacts — useful for the planner).
export default function ShareVendorList({ data, t }) {
  const vendors = data.vendors || [];
  if (vendors.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="py-8 text-center text-sm text-ink-400">{t("sharePage.empty")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {vendors.map((v, i) => (
        <Card key={i}>
          <CardBody className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-ink-900">{v.name}</h3>
                <p className="text-xs text-ink-500">{v.category || "—"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={v.code === "HP" ? "hp" : "kk"}>{v.code}</Badge>
                <Badge tone={STATUS_TONE[v.contract_status] || "neutral"}>
                  {t(`vendors.status.${v.contract_status}`)}
                </Badge>
              </div>
            </div>
            <div className="space-y-0.5 text-xs text-ink-600">
              {v.contact_name && <p>👤 {v.contact_name}</p>}
              {v.email && <p className="truncate">✉️ {v.email}</p>}
              {v.phone && <p>📞 {v.phone}</p>}
            </div>
            {v.is_halal_certified && <Badge tone="green">✓ {t("vendors.halalCertified")}</Badge>}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
