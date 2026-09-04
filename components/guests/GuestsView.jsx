"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WEDDINGS } from "@/lib/theme";
import { isFamilyOnlyEvent } from "@/lib/events";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveGuest, deleteGuest } from "@/app/(app)/guests/actions";
import useOptimisticWrite, { newTempId } from "@/components/hooks/useOptimisticWrite";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ExportButton from "@/components/share/ExportButton";
import Icon from "@/components/ui/Icon";

const DIET_OPTIONS = ["halal", "vegetarian", "vegan", "gluten-free"];
const SIDES = ["bride", "groom", "both"];
const STATUSES = ["confirmed", "pending", "declined"];
const STATUS_TONE = { confirmed: "green", pending: "amber", declined: "red" };
const COUNTRIES = ["Australia", "Malaysia", "Vietnam", "Indonesia", "Misc countries"];
const CATEGORIES = ["Family", "Friends", "Work", "Other"];
const INVITE_STATUSES = ["Invite", "Not 100%"];

// The stored value doubles as the translation key (same idiom as
// guests.diet.*), but makeT falls back to returning the key path when a key is
// missing — so a value typed straight into Supabase that isn't in the lists
// above would render on the page as the literal string
// "guests.countries.Freedonia". Compare the result against the key and fall
// back to the raw stored value instead. Returns null when nothing is stored, so
// callers can skip rendering entirely; that also covers the live rows whose
// side is NULL and used to print "guests.sides.null".
function optionLabel(t, group, value) {
  if (!value) return null;
  const key = `guests.${group}.${value}`;
  const label = t(key);
  return label === key ? value : label;
}

// Palette pairs copied from Badge's amber and neutral tones — the tone
// vocabulary is Badge's, but the chip below is deliberately not a <Badge>: see
// InviteChip.
const INVITE_TONE = {
  "Not 100%": "bg-gold-100 text-gold-700", // Badge tone="amber"
};

// Invite status is the one new field with planning weight, so it gets a
// coloured chip — but only when it says something. "Invite" is the value on
// roughly 70 of the 85 live rows: a chip on almost every row is chrome, not
// signal, so the default case is drawn as nothing at all and the eye goes
// straight to the exceptions a planner actually acts on. An unrecognised value
// still gets a neutral chip rather than silently vanishing.
function inviteTone(value) {
  if (!value || value === "Invite") return null;
  return INVITE_TONE[value] || "bg-stone-100 text-stone-700"; // Badge tone="neutral"
}

// Not a <Badge> on purpose. Badge is 11px mono with tracking-chrome, which
// globals.css reserves for chrome precisely because it mangles Vietnamese
// diacritics and CJK — and these labels are translated user content ("Không
// chắc", "不邀请"). Same reason the plus-one name sits outside a Badge.
function InviteChip({ t, value }) {
  const tone = inviteTone(value);
  if (!tone) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-sans text-xs font-medium ${tone}`}>
      {optionLabel(t, "inviteStatuses", value)}
    </span>
  );
}

// Country and category are descriptors rather than signals, so they ride as
// plain sans text at the end of the row — outside a Badge for the same
// glyph-coverage reason as InviteChip. Renders nothing when both are unset.
function GuestMeta({ t, guest }) {
  const parts = [
    optionLabel(t, "countries", guest.country),
    optionLabel(t, "categories", guest.category),
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <span className="text-sm text-stone-500">{parts.join(" · ")}</span>;
}

const blank = {
  id: null,
  full_name: "",
  side: "both",
  plus_one: false,
  plus_one_name: "",
  dietary: [],
  notes: "",
  country: "",
  category: "",
  invite_or_not: "",
  invites: [],
};

export default function GuestsView({ guests: initial, events, preview }) {
  const { t, scope, locale } = useApp();
  const [guests, setGuests] = useState(initial);
  const [form, setForm] = useState(null);
  const { error, dismissError, run } = useOptimisticWrite();
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [inviteFilter, setInviteFilter] = useState("all");
  // Which summary card is acting as a filter (null = show all in the base set).
  const [metricFilter, setMetricFilter] = useState(null);

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  // Events a guest can actually be invited to / RSVP for. Excludes the
  // family-only Lễ Dạm Ngõ (Family Introduction).
  const invitableEvents = useMemo(() => events.filter((e) => !isFamilyOnlyEvent(e)), [events]);

  // Invites relevant to the current scope (all when BOTH).
  const scopedInvites = (g) =>
    scope === "BOTH" ? g.invites : g.invites.filter((i) => i.code === scope);

  const inScope = (g) => scope === "BOTH" || g.invites.length === 0 || g.invites.some((i) => i.code === scope);

  // Does guest g match a clickable summary card? Counts one PER GUEST, not per
  // event invitation.
  function matchesMetric(g, metric) {
    switch (metric) {
      case "invited":
        return scopedInvites(g).length > 0;
      case "confirmed":
        return scopedInvites(g).some((i) => i.status === "confirmed");
      case "plusOnes":
        return !!g.plus_one;
      case "diet":
        return (g.dietary?.length || 0) > 0;
      default:
        return true; // "total" / null → everyone
    }
  }

  // Base set: scope + search + side + response-dropdown filters. The summary
  // cards read their totals from this set (so the numbers stay stable), and the
  // visible list applies the active card filter on top of it.
  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests
      .filter(inScope)
      .filter((g) => !q || g.full_name.toLowerCase().includes(q))
      .filter((g) => sideFilter === "all" || g.side === sideFilter)
      .filter((g) => statusFilter === "all" || scopedInvites(g).some((i) => i.status === statusFilter))
      .filter((g) => countryFilter === "all" || g.country === countryFilter)
      .filter((g) => categoryFilter === "all" || g.category === categoryFilter)
      .filter((g) => inviteFilter === "all" || g.invite_or_not === inviteFilter);
  }, [guests, search, sideFilter, statusFilter, countryFilter, categoryFilter, inviteFilter, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(
    () => (metricFilter ? base.filter((g) => matchesMetric(g, metricFilter)) : base),
    [base, metricFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Distinct-guest counts (one per guest, never per event invitation).
  const stats = useMemo(
    () => ({
      total: base.length,
      invited: base.filter((g) => matchesMetric(g, "invited")).length,
      confirmed: base.filter((g) => matchesMetric(g, "confirmed")).length,
      plusOnes: base.filter((g) => matchesMetric(g, "plusOnes")).length,
      diet: base.filter((g) => matchesMetric(g, "diet")).length,
    }),
    [base] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Click a card to filter; click it again (or click Guests) to clear.
  function toggleMetric(metric) {
    setMetricFilter((cur) => (!metric || metric === "total" ? null : cur === metric ? null : metric));
  }

  function openNew() {
    setForm({ ...blank });
  }
  function openEdit(g) {
    setForm({
      id: g.id,
      full_name: g.full_name,
      side: g.side || "both",
      plus_one: !!g.plus_one,
      plus_one_name: g.plus_one_name || "",
      dietary: [...(g.dietary || [])],
      notes: g.notes || "",
      country: g.country || "",
      category: g.category || "",
      invite_or_not: g.invite_or_not || "",
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
    const payload = {
      ...form,
      full_name: form.full_name.trim(),
      // Mirrors the normalisation in saveGuest, so the optimistic row below
      // matches what actually lands in the database.
      plus_one_name: form.plus_one ? form.plus_one_name.trim() : "",
      invites,
    };
    const editingId = form.id;
    const previousRow = editingId ? guests.find((g) => g.id === editingId) : null;
    const tempId = newTempId();
    setForm(null);

    run({
      apply: () =>
        setGuests((prev) =>
          editingId
            ? prev.map((g) => (g.id === editingId ? { ...g, ...payload } : g))
            : [...prev, { ...payload, id: tempId }]
        ),
      action: () => saveGuest({ ...payload, id: editingId }),
      revert: () =>
        setGuests((prev) =>
          editingId
            ? prev.map((g) => (g.id === editingId && previousRow ? previousRow : g))
            : prev.filter((g) => g.id !== tempId)
        ),
      adopt: (id) => setGuests((prev) => prev.map((g) => (g.id === tempId ? { ...g, id } : g))),
      message: t("common.saveFailed"),
    });
  }

  function handleDelete(g) {
    if (!window.confirm(t("guests.deleteConfirm"))) return;
    const index = guests.findIndex((x) => x.id === g.id);
    run({
      apply: () => setGuests((prev) => prev.filter((x) => x.id !== g.id)),
      action: () => deleteGuest(g.id),
      revert: () =>
        setGuests((prev) => {
          const next = [...prev];
          next.splice(index < 0 ? next.length : index, 0, g);
          return next;
        }),
      message: t("common.deleteFailed"),
    });
  }

  function exportRows() {
    return visible.map((g) => ({
      [t("guests.fullName")]: g.full_name,
      [t("guests.side")]: optionLabel(t, "sides", g.side) || "",
      // Same unconditional-key rule as the plus-one name below: emit "" rather
      // than dropping the key, or the column vanishes for everyone whenever the
      // first guest happens to have no country / category / invite status.
      [t("guests.country")]: optionLabel(t, "countries", g.country) || "",
      [t("guests.category")]: optionLabel(t, "categories", g.category) || "",
      [t("guests.inviteStatus")]: optionLabel(t, "inviteStatuses", g.invite_or_not) || "",
      [t("guests.plusOne")]: g.plus_one ? "✓" : "",
      // Always emit this key, even when empty: toCSV takes its headers from
      // Object.keys(rows[0]) alone, so a conditional key would drop the column
      // for everyone whenever the first guest happens to have no plus one.
      [t("guests.plusOneName")]: (g.plus_one && g.plus_one_name) || "",
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
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("guests.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("guests.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber"><Icon name="warning" size={12} />{t("common.preview")}</Badge>}
          <ExportButton getRows={exportRows} filename="guest-list" sheetName={t("guests.title")} />
          <Button variant="gold" onClick={openNew}>
            + {t("guests.addGuest")}
          </Button>
        </div>
      </div>

      <ErrorBanner
        error={error}
        onDismiss={dismissError}
        dismissLabel={t("common.close")}
        detailsLabel={t("common.errorDetails")}
      />

      {/* Summary — each card is a clickable filter for the list below. */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label={t("guests.totalGuests")}
              value={stats.total}
              metric="total"
              active={metricFilter === null}
              onClick={toggleMetric}
            />
            <Stat
              label={t("rsvp.invited")}
              value={stats.invited}
              metric="invited"
              active={metricFilter === "invited"}
              onClick={toggleMetric}
            />
            <Stat
              label={t("rsvp.confirmed")}
              value={stats.confirmed}
              tone="green"
              metric="confirmed"
              active={metricFilter === "confirmed"}
              onClick={toggleMetric}
            />
            <Stat
              label={t("guests.plusOnes")}
              value={stats.plusOnes}
              metric="plusOnes"
              active={metricFilter === "plusOnes"}
              onClick={toggleMetric}
            />
            <Stat
              label={t("guests.dietaryNeeds")}
              value={stats.diet}
              metric="diet"
              active={metricFilter === "diet"}
              onClick={toggleMetric}
            />
          </div>
        </CardBody>
      </Card>

      {/* Filters — six controls, so the row wraps to a second line on narrower
          desktops; items-center keeps the wrapped rows aligned. */}
      <div className="flex flex-wrap items-center gap-2">
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
        <select className="input max-w-[11rem]" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
          <option value="all">{t("guests.allCountries")}</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {optionLabel(t, "countries", c)}
            </option>
          ))}
        </select>
        <select className="input max-w-[11rem]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">{t("guests.allCategories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {optionLabel(t, "categories", c)}
            </option>
          ))}
        </select>
        <select className="input max-w-[11rem]" value={inviteFilter} onChange={(e) => setInviteFilter(e.target.value)}>
          <option value="all">{t("guests.allInviteStatuses")}</option>
          {INVITE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {optionLabel(t, "inviteStatuses", s)}
            </option>
          ))}
        </select>
      </div>

      {/* Guest list */}
      {visible.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-stone-400">{t("guests.noGuests")}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-stone-100">
              {visible.map((g) => (
                <li key={g.id} className="group flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-600">
                    {initials(g.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-stone-900">{g.full_name}</span>
                      {/* side is NULL on a couple of live rows — guard it, or
                          the badge prints the raw key path. */}
                      {g.side && <Badge tone="neutral">{optionLabel(t, "sides", g.side)}</Badge>}
                      <InviteChip t={t} value={g.invite_or_not} />
                      {g.plus_one && (
                        <>
                          <Badge tone="gold">+1</Badge>
                          {/* Name sits outside the Badge on purpose: Badge is
                              11px mono chrome, which mangles Vietnamese
                              diacritics and CJK. */}
                          {g.plus_one_name && (
                            <span className="text-sm text-stone-700">{g.plus_one_name}</span>
                          )}
                        </>
                      )}
                      {(g.dietary || []).map((d) => (
                        <Badge key={d} tone="kk">
                          {t(`guests.diet.${d}`)}
                        </Badge>
                      ))}
                      <GuestMeta t={t} guest={g} />
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
                    <IconBtn label={t("common.edit")} onClick={() => openEdit(g)}><Icon name="edit" size={15} /></IconBtn>
                    <IconBtn label={t("common.delete")} onClick={() => handleDelete(g)}><Icon name="trash" size={15} /></IconBtn>
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
        events={invitableEvents}
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

// Structure from main (#11): the card is a toggle that filters the list.
// Palette from develop: the ink scale no longer exists, and the focus ring is
// matcha-600 like every other control — gold-400 measures 2.35:1 on white,
// under the 3:1 WCAG 1.4.11 floor for a focus indicator.
function Stat({ label, value, tone = "stone", metric, active = false, onClick }) {
  const color = tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-stone-900";
  return (
    <button
      type="button"
      onClick={() => onClick?.(metric)}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2 text-left transition hover:border-gold-300 hover:bg-gold-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-matcha-600 ${
        active ? "border-gold-400 bg-gold-50" : "border-transparent"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-stone-700">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${color}`}>{value}</p>
    </button>
  );
}

function IconBtn({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
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

        {/* Invite status leads the new fields rather than trailing them: it's
            the planning decision, not a descriptor. The blank option clears the
            value back to NULL. */}
        <div>
          <label className="label">{t("guests.inviteStatus")}</label>
          <select className="input" value={form.invite_or_not} onChange={set("invite_or_not")}>
            <option value="">{t("guests.unset")}</option>
            {INVITE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {optionLabel(t, "inviteStatuses", s)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("guests.country")}</label>
            <select className="input" value={form.country} onChange={set("country")}>
              <option value="">{t("guests.unset")}</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {optionLabel(t, "countries", c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("guests.category")}</label>
            <select className="input" value={form.category} onChange={set("category")}>
              <option value="">{t("guests.unset")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {optionLabel(t, "categories", c)}
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
                    on ? "border-kk-300 bg-kk-100 text-kk-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {t(`guests.diet.${d}`)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-500 text-gold-600"
            checked={form.plus_one}
            onChange={(e) => setForm((f) => ({ ...f, plus_one: e.target.checked }))}
          />
          {t("guests.plusOne")}
        </label>

        {/* Un-ticking hides this but deliberately keeps what was typed in form
            state, so a mis-click and re-tick doesn't lose it. The name is only
            discarded on save, by handleSave and again server-side. */}
        {form.plus_one ? (
          <div>
            <label className="label" htmlFor="plus-one-name">
              {t("guests.plusOneName")}
            </label>
            <input
              id="plus-one-name"
              className="input"
              value={form.plus_one_name}
              onChange={set("plus_one_name")}
            />
          </div>
        ) : null}

        {/* Invitations — the family-only Lễ Dạm Ngõ is already filtered out of `events`. */}
        <div>
          <label className="label">{t("guests.invitations")}</label>
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {events.map((ev) => {
              const invited = isInvited(ev.id);
              const inv = form.invites.find((i) => i.event_id === ev.id);
              return (
                <li key={ev.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-500"
                    checked={invited}
                    onChange={() => toggleInvite(ev.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-stone-800">{ev.name?.[locale] || ev.name?.en}</p>
                  </div>
                  <Badge tone={ev.code === "HP" ? "hp" : "kk"}>{ev.code}</Badge>
                  <select
                    disabled={!invited}
                    value={inv?.status || "pending"}
                    onChange={(e) => setInviteStatus(ev.id, e.target.value)}
                    className="rounded-md border border-stone-500 bg-white px-1.5 py-1 text-xs text-stone-700 disabled:opacity-40"
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
