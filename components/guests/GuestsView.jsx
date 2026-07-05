"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WEDDINGS } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveGuest, deleteGuest } from "@/app/(app)/guests/actions";
import ExportButton from "@/components/share/ExportButton";

const DIET_OPTIONS = ["halal", "vegetarian", "vegan", "gluten-free"];
const SIDES = ["bride", "groom", "both"];
const STATUSES = ["confirmed", "pending", "declined"];
const STATUS_TONE = { confirmed: "green", pending: "amber", declined: "red" };

const blank = {
  id: null,
  full_name: "",
  side: "both",
  plus_one: false,
  dietary: [],
  notes: "",
  invites: [],
};

export default function GuestsView({ guests: initial, events, preview }) {
  const { t, scope, locale } = useApp();
  const [guests, setGuests] = useState(initial);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  // Invites relevant to the current scope (all when BOTH).
  const scopedInvites = (g) =>
    scope === "BOTH" ? g.invites : g.invites.filter((i) => i.code === scope);

  const inScope = (g) => scope === "BOTH" || g.invites.length === 0 || g.invites.some((i) => i.code === scope);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests
      .filter(inScope)
      .filter((g) => !q || g.full_name.toLowerCase().includes(q))
      .filter((g) => sideFilter === "all" || g.side === sideFilter)
      .filter((g) => statusFilter === "all" || scopedInvites(g).some((i) => i.status === statusFilter));
  }, [guests, search, sideFilter, statusFilter, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    let invited = 0;
    const counts = { confirmed: 0, pending: 0, declined: 0 };
    let plusOnes = 0;
    let diet = 0;
    visible.forEach((g) => {
      const inv = scopedInvites(g);
      invited += inv.length;
      inv.forEach((i) => {
        if (counts[i.status] != null) counts[i.status] += 1;
      });
      if (g.plus_one) plusOnes += 1;
      if (g.dietary?.length) diet += 1;
    });
    return { total: visible.length, invited, ...counts, plusOnes, diet };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    setForm({ ...blank });
  }
  function openEdit(g) {
    setForm({
      id: g.id,
      full_name: g.full_name,
      side: g.side || "both",
      plus_one: !!g.plus_one,
      dietary: [...(g.dietary || [])],
      notes: g.notes || "",
      invites: g.invites.map((i) => ({ event_id: i.event_id, status: i.status })),
    });
  }

  function handleSave() {
    if (!form.full_name.trim()) return;
    const invites = form.invites.map((i) => ({
      event_id: i.event_id,
      status: i.status,
      code: eventById.get(i.event_id)?.code,
    }));
    const payload = { ...form, full_name: form.full_name.trim(), invites };
    setGuests((prev) => {
      if (form.id) return prev.map((g) => (g.id === form.id ? { ...g, ...payload } : g));
      return [...prev, { ...payload, id: crypto.randomUUID() }];
    });
    setForm(null);
    saveGuest({ ...payload, id: form.id }).catch(() => {});
  }

  function handleDelete(g) {
    if (!window.confirm(t("guests.deleteConfirm"))) return;
    setGuests((prev) => prev.filter((x) => x.id !== g.id));
    deleteGuest(g.id).catch(() => {});
  }

  function exportRows() {
    return visible.map((g) => ({
      [t("guests.fullName")]: g.full_name,
      [t("guests.side")]: t(`guests.sides.${g.side}`),
      [t("guests.plusOne")]: g.plus_one ? "✓" : "",
      [t("guests.dietary")]: (g.dietary || []).map((d) => t(`guests.diet.${d}`)).join(", "),
      [t("rsvp.title")]: scopedInvites(g)
        .map((i) => {
          const ev = eventById.get(i.event_id);
          return `${ev?.name?.[locale] || ev?.name?.en || i.code}: ${t(`rsvp.status.${i.status}`)}`;
        })
        .join("; "),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{t("guests.title")}</h1>
          <p className="mt-0.5 text-sm text-ink-500">{t("guests.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber">⚠️ {t("common.preview")}</Badge>}
          <ExportButton getRows={exportRows} filename="guest-list" sheetName={t("guests.title")} />
          <Button variant="gold" onClick={openNew}>
            + {t("guests.addGuest")}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={t("guests.totalGuests")} value={stats.total} />
            <Stat label={t("rsvp.invited")} value={stats.invited} />
            <Stat label={t("rsvp.confirmed")} value={stats.confirmed} tone="green" />
            <Stat label={t("rsvp.pending")} value={stats.pending} tone="amber" />
            <Stat label={t("guests.plusOnes")} value={stats.plusOnes} />
            <Stat label={t("guests.dietaryNeeds")} value={stats.diet} />
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="input max-w-xs"
          placeholder={t("guests.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[11rem]" value={sideFilter} onChange={(e) => setSideFilter(e.target.value)}>
          <option value="all">{t("guests.allSides")}</option>
          {SIDES.map((s) => (
            <option key={s} value={s}>
              {t(`guests.sides.${s}`)}
            </option>
          ))}
        </select>
        <select className="input max-w-[11rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("rsvp.responses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`rsvp.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Guest list */}
      {visible.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-ink-400">{t("guests.noGuests")}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-ink-100">
              {visible.map((g) => (
                <li key={g.id} className="group flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-sm font-semibold text-ink-600">
                    {initials(g.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900">{g.full_name}</span>
                      <Badge tone="neutral">{t(`guests.sides.${g.side}`)}</Badge>
                      {g.plus_one && <Badge tone="gold">+1</Badge>}
                      {(g.dietary || []).map((d) => (
                        <Badge key={d} tone="kk">
                          {t(`guests.diet.${d}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                    {scopedInvites(g).map((i) => {
                      const ev = eventById.get(i.event_id);
                      return (
                        <span
                          key={i.event_id}
                          title={`${ev?.name?.[locale] || ev?.name?.en || ""}: ${t(`rsvp.status.${i.status}`)}`}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${chipClass(i.status)}`}
                        >
                          {i.code}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <IconBtn label={t("common.edit")} onClick={() => openEdit(g)}>✎</IconBtn>
                    <IconBtn label={t("common.delete")} onClick={() => handleDelete(g)}>🗑</IconBtn>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <GuestForm
        form={form}
        setForm={setForm}
        events={events}
        onSave={handleSave}
        onClose={() => setForm(null)}
        t={t}
        locale={locale}
      />
    </div>
  );
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

function chipClass(status) {
  return status === "confirmed"
    ? "bg-emerald-100 text-emerald-700"
    : status === "declined"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
}

function Stat({ label, value, tone = "ink" }) {
  const color = tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-ink-900";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function IconBtn({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
    >
      {children}
    </button>
  );
}

function GuestForm({ form, setForm, events, onSave, onClose, t, locale }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleDiet(d) {
    setForm((f) => ({
      ...f,
      dietary: f.dietary.includes(d) ? f.dietary.filter((x) => x !== d) : [...f.dietary, d],
    }));
  }
  function isInvited(eventId) {
    return form.invites.some((i) => i.event_id === eventId);
  }
  function toggleInvite(eventId) {
    setForm((f) => ({
      ...f,
      invites: isInvited(eventId)
        ? f.invites.filter((i) => i.event_id !== eventId)
        : [...f.invites, { event_id: eventId, status: "pending" }],
    }));
  }
  function setInviteStatus(eventId, status) {
    setForm((f) => ({
      ...f,
      invites: f.invites.map((i) => (i.event_id === eventId ? { ...i, status } : i)),
    }));
  }

  return (
    <Modal
      open={!!form}
      onClose={onClose}
      size="lg"
      title={form.id ? t("guests.editGuest") : t("guests.newGuest")}
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
            <label className="label">{t("guests.fullName")}</label>
            <input className="input" value={form.full_name} onChange={set("full_name")} autoFocus />
          </div>
          <div>
            <label className="label">{t("guests.side")}</label>
            <select className="input" value={form.side} onChange={set("side")}>
              {SIDES.map((s) => (
                <option key={s} value={s}>
                  {t(`guests.sides.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">{t("guests.dietary")}</label>
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((d) => {
              const on = form.dietary.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDiet(d)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on ? "border-kk-300 bg-kk-100 text-kk-700" : "border-ink-200 text-ink-500 hover:bg-ink-50"
                  }`}
                >
                  {t(`guests.diet.${d}`)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-gold-600"
            checked={form.plus_one}
            onChange={(e) => setForm((f) => ({ ...f, plus_one: e.target.checked }))}
          />
          {t("guests.plusOne")}
        </label>

        {/* Invitations */}
        <div>
          <label className="label">{t("guests.invitations")}</label>
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
            {events.map((ev) => {
              const invited = isInvited(ev.id);
              const inv = form.invites.find((i) => i.event_id === ev.id);
              return (
                <li key={ev.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink-300"
                    checked={invited}
                    onChange={() => toggleInvite(ev.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-800">{ev.name?.[locale] || ev.name?.en}</p>
                  </div>
                  <Badge tone={ev.code === "HP" ? "hp" : "kk"}>{ev.code}</Badge>
                  <select
                    disabled={!invited}
                    value={inv?.status || "pending"}
                    onChange={(e) => setInviteStatus(ev.id, e.target.value)}
                    className="rounded-md border border-ink-200 bg-white px-1.5 py-1 text-xs text-ink-600 disabled:opacity-40"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`rsvp.status.${s}`)}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <label className="label">{t("guests.notes")}</label>
          <textarea className="input min-h-[3.5rem]" value={form.notes} onChange={set("notes")} />
        </div>
      </form>
    </Modal>
  );
}
