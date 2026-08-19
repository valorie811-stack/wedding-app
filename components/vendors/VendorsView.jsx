"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { inScope } from "@/lib/dashboard";
import { formatMoney, formatAUD, toAUD, pct } from "@/lib/format";
import { WEDDINGS, WEDDING_LIST } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveVendor, deleteVendor } from "@/app/(app)/vendors/actions";
import ExportButton from "@/components/share/ExportButton";
import Icon from "@/components/ui/Icon";

const STATUSES = ["enquiry", "quoted", "booked", "paid", "cancelled"];
const STATUS_TONE = {
  enquiry: "neutral",
  quoted: "amber",
  booked: "kk",
  paid: "green",
  cancelled: "red",
};

const blank = {
  id: null,
  code: "HP",
  name: "",
  category: "",
  contact_name: "",
  email: "",
  phone: "",
  contract_status: "enquiry",
  total_cost: "",
  deposit_paid: "",
  is_halal_certified: false,
  notes: "",
};

export default function VendorsView({ vendors: initial, preview }) {
  const { t, scope } = useApp();
  const [vendors, setVendors] = useState(initial);
  const [form, setForm] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState(null);

  // Derived from current state, not the server prop, so a category typed into a
  // brand-new vendor shows up in this filter without a page reload.
  const categories = useMemo(
    () => [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort(),
    [vendors]
  );

  const visible = useMemo(
    () =>
      vendors
        .filter((v) => inScope(v.code, scope))
        .filter((v) => statusFilter === "all" || v.contract_status === statusFilter)
        .filter((v) => categoryFilter === "all" || v.category === categoryFilter),
    [vendors, scope, statusFilter, categoryFilter]
  );

  const totals = useMemo(() => {
    let cost = 0;
    let deposit = 0;
    visible
      .filter((v) => v.contract_status !== "cancelled")
      .forEach((v) => {
        cost += toAUD(v.total_cost, v.currency);
        deposit += toAUD(v.deposit_paid, v.currency);
      });
    return { count: visible.length, cost, deposit, balance: Math.max(0, cost - deposit) };
  }, [visible]);

  function openNew() {
    setForm({ ...blank, code: scope === "KK" ? "KK" : "HP" });
  }
  function openEdit(v) {
    setForm({
      ...v,
      category: v.category || "",
      contact_name: v.contact_name || "",
      email: v.email || "",
      phone: v.phone || "",
      notes: v.notes || "",
      total_cost: String(v.total_cost ?? ""),
      deposit_paid: String(v.deposit_paid ?? ""),
    });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const currency = WEDDINGS[form.code]?.currency;
    const payload = {
      ...form,
      currency,
      name: form.name.trim(),
      total_cost: Number(form.total_cost) || 0,
      deposit_paid: Number(form.deposit_paid) || 0,
    };

    const editingId = form.id;
    const previousRow = editingId ? vendors.find((v) => v.id === editingId) : null;
    // Placeholder id for the optimistic row. The database assigns the real one,
    // which we swap in below — otherwise the next edit or delete would target an
    // id the database never issued and silently do nothing.
    const tempId = `pending-${crypto.randomUUID()}`;

    setVendors((prev) => {
      if (editingId) return prev.map((v) => (v.id === editingId ? { ...v, ...payload } : v));
      return [...prev, { ...payload, id: tempId }];
    });
    setForm(null);
    setError(null);

    const res = await saveVendor(payload).catch((e) => ({ ok: false, error: String(e?.message || e) }));

    if (!res?.ok) {
      setVendors((prev) =>
        editingId
          ? prev.map((v) => (v.id === editingId && previousRow ? previousRow : v))
          : prev.filter((v) => v.id !== tempId)
      );
      setError(`${t("vendors.saveFailed")}${res?.error ? ` (${res.error})` : ""}`);
      return;
    }
    if (res.id) {
      setVendors((prev) => prev.map((v) => (v.id === tempId ? { ...v, id: res.id } : v)));
    }
  }

  async function handleDelete(v) {
    if (!window.confirm(t("vendors.deleteConfirm"))) return;
    const index = vendors.findIndex((x) => x.id === v.id);
    setVendors((prev) => prev.filter((x) => x.id !== v.id));
    setError(null);

    const res = await deleteVendor(v.id).catch((e) => ({ ok: false, error: String(e?.message || e) }));
    if (!res?.ok) {
      // Put the row back where it was so the list order survives a failed delete.
      setVendors((prev) => {
        const next = [...prev];
        next.splice(index < 0 ? next.length : index, 0, v);
        return next;
      });
      setError(`${t("vendors.deleteFailed")}${res?.error ? ` (${res.error})` : ""}`);
    }
  }

  function exportRows() {
    return visible.map((v) => ({
      [t("vendors.name")]: v.name,
      [t("vendors.category")]: v.category || "",
      [t("common.wedding")]: v.code,
      [t("vendors.contractStatus")]: t(`vendors.status.${v.contract_status}`),
      [t("vendors.contactName")]: v.contact_name || "",
      [t("vendors.email")]: v.email || "",
      [t("vendors.phone")]: v.phone || "",
      [t("vendors.totalCost")]: v.total_cost,
      [t("vendors.depositPaid")]: v.deposit_paid,
      [t("vendors.balanceDue")]: Math.max(0, Number(v.total_cost) - Number(v.deposit_paid)),
      Currency: v.currency,
      [t("vendors.halal")]: v.is_halal_certified ? "✓" : "",
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("vendors.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("vendors.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber"><Icon name="warning" size={12} />{t("common.preview")}</Badge>}
          <ExportButton getRows={exportRows} filename="vendor-list" sheetName={t("vendors.title")} />
          <Button variant="gold" onClick={openNew}>
            + {t("vendors.addVendor")}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p className="flex items-start gap-2">
            <Icon name="warning" size={14} />
            {error}
          </p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label={t("common.close")}
            className="shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label={t("vendors.title")} value={totals.count} />
            <Stat label={t("vendors.totalCost")} value={formatAUD(totals.cost)} tone="ink" />
            <Stat label={t("vendors.depositPaid")} value={formatAUD(totals.deposit)} tone="kk" />
            <Stat label={t("vendors.balanceDue")} value={formatAUD(totals.balance)} tone="gold" />
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-[12rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("vendors.allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`vendors.status.${s}`)}
            </option>
          ))}
        </select>
        <select className="input max-w-[12rem]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">{t("vendors.allCategories")}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Vendor grid */}
      {visible.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-stone-400">{t("vendors.noVendors")}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((v) => (
            <VendorCard key={v.id} v={v} t={t} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <VendorForm form={form} setForm={setForm} onSave={handleSave} onClose={() => setForm(null)} t={t} />
    </div>
  );
}

function Stat({ label, value, tone = "ink" }) {
  const color =
    tone === "kk" ? "text-kk-700" : tone === "gold" ? "text-gold-700" : "text-stone-900";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function VendorCard({ v, t, onEdit, onDelete }) {
  const currency = v.currency;
  const paidPct = pct(v.deposit_paid, v.total_cost);
  const balance = Math.max(0, Number(v.total_cost) - Number(v.deposit_paid));
  return (
    <Card className="group flex flex-col">
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-stone-900">{v.name}</h3>
            <p className="text-xs text-stone-500">{v.category || "—"}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone={v.code === "HP" ? "hp" : "kk"}>{v.code}</Badge>
            <Badge tone={STATUS_TONE[v.contract_status]}>{t(`vendors.status.${v.contract_status}`)}</Badge>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-0.5 text-xs text-stone-600">
          {v.contact_name && <p>👤 {v.contact_name}</p>}
          {v.email && <p className="truncate">✉️ {v.email}</p>}
          {v.phone && <p>📞 {v.phone}</p>}
        </div>

        {/* Payment progress */}
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-stone-500">{t("vendors.paymentProgress")}</span>
            <span className="text-stone-600">{paidPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-kk-500" style={{ width: `${Math.min(100, paidPct)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-stone-500">
              {formatMoney(v.deposit_paid, currency)} / {formatMoney(v.total_cost, currency)}
            </span>
            <span className="font-medium text-gold-700">
              {t("vendors.balanceDue")}: {formatMoney(balance, currency)}
            </span>
          </div>
        </div>

        {v.is_halal_certified && (
          <div>
            <Badge tone="green"><Icon name="check" size={12} />{t("vendors.halalCertified")}</Badge>
          </div>
        )}
        {v.notes && <p className="text-xs italic text-stone-500">{v.notes}</p>}

        <div className="mt-auto flex justify-end gap-1 pt-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={() => onEdit(v)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            <Icon name="edit" size={13} /> {t("common.edit")}
          </button>
          <button
            onClick={() => onDelete(v)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="trash" size={13} /> {t("common.delete")}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function VendorForm({ form, setForm, onSave, onClose, t }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      open={!!form}
      onClose={onClose}
      size="lg"
      title={form.id ? t("vendors.editVendor") : t("vendors.newVendor")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={onSave}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("vendors.name")}</label>
            <input className="input" value={form.name} onChange={set("name")} autoFocus />
          </div>
          <div>
            <label className="label">{t("vendors.category")}</label>
            <input className="input" value={form.category} onChange={set("category")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("common.wedding")}</label>
            <select className="input" value={form.code} onChange={set("code")}>
              {WEDDING_LIST.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.flag} {w.city.en} ({w.currency})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("vendors.contractStatus")}</label>
            <select className="input" value={form.contract_status} onChange={set("contract_status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`vendors.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">{t("vendors.contactName")}</label>
            <input className="input" value={form.contact_name} onChange={set("contact_name")} />
          </div>
          <div>
            <label className="label">{t("vendors.email")}</label>
            <input className="input" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label">{t("vendors.phone")}</label>
            <input className="input" value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              {t("vendors.totalCost")} ({WEDDINGS[form.code]?.currency})
            </label>
            <input className="input" type="number" min="0" value={form.total_cost} onChange={set("total_cost")} />
          </div>
          <div>
            <label className="label">
              {t("vendors.depositPaid")} ({WEDDINGS[form.code]?.currency})
            </label>
            <input className="input" type="number" min="0" value={form.deposit_paid} onChange={set("deposit_paid")} />
          </div>
        </div>
        <div>
          <label className="label">{t("vendors.notes")}</label>
          <textarea className="input min-h-[4rem]" value={form.notes} onChange={set("notes")} />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-500 text-kk-600"
            checked={form.is_halal_certified}
            onChange={(e) => setForm((f) => ({ ...f, is_halal_certified: e.target.checked }))}
          />
          {t("vendors.halalCertified")}
        </label>
      </form>
    </Modal>
  );
}
