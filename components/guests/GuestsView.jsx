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
import { headcount, totalHeads, minPartySize, normalizePartySize } from "@/lib/guests";

const DIET_OPTIONS = ["halal", "vegetarian", "vegan", "gluten-free"];
// The groom's parents keep their own guest lists and chase them separately, so
// 'groom mom' and 'groom dad' are sides in their own right — together 100 of the
// 223 live rows, more than 'both' and 'bride' combined. Listed next to 'groom'
// rather than appended, so the groom's three entries read as a group.
const SIDES = ["bride", "groom", "groom mom", "groom dad", "both"];
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

// Side, country and category are descriptors rather than signals, and each now
// owns a column whose header says what it is — so they are plain sans text
// rather than chips. Outside a Badge for the same glyph-coverage reason as
// InviteChip: these are translated values ("Nhà gái", "男方母亲"). Falls back to
// the em dash the form already uses for "not recorded", so a column never has
// a silently empty cell.
function Cell({ t, group, value }) {
  const label = optionLabel(t, group, value);
  return label ? (
    <span className="text-stone-700">{label}</span>
  ) : (
    <span className="text-stone-400">{t("guests.unset")}</span>
  );
}

const blank = {
  id: null,
  full_name: "",
  side: "both",
  plus_one: false,
  plus_one_name: "",
  // "" rather than 1: blank is "not recorded yet", which is the honest state
  // for a guest who has not replied. normalizePartySize turns it into NULL.
  party_size: "",
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

  // Distinct-guest counts (one per guest, never per event invitation). The
  // cards count invite units, because that is what the list below shows and
  // what clicking a card filters — but an invite unit is not a person, so the
  // two that drive real decisions carry their head count underneath. Confirmed
  // heads is the number catering and seating actually need.
  const stats = useMemo(
    () => {
      const confirmed = base.filter((g) => matchesMetric(g, "confirmed"));
      return {
        total: base.length,
        totalHeads: totalHeads(base),
        invited: base.filter((g) => matchesMetric(g, "invited")).length,
        confirmed: confirmed.length,
        confirmedHeads: totalHeads(confirmed),
        plusOnes: base.filter((g) => matchesMetric(g, "plusOnes")).length,
        diet: base.filter((g) => matchesMetric(g, "diet")).length,
      };
    },
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
      party_size: g.party_size ?? "",
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
      // Mirrors saveGuest exactly — same normalisation, same floor — so the
      // optimistic row counts the same heads as the one that lands.
      party_size: (() => {
        const size = normalizePartySize(form.party_size);
        return size == null ? null : Math.max(size, minPartySize(form));
      })(),
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
      // The head count the app itself counts by, not the raw column — a row
      // with no recorded size still exports the 1 or 2 it is worth, so the
      // column sums to the same total the summary cards show.
      [t("guests.partySize")]: headcount(g),
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
              sub={t("guests.heads", { n: stats.totalHeads })}
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
              sub={t("guests.heads", { n: stats.confirmedHeads })}
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
        // overflow-hidden because the body below really is edge to edge: the
        // pinned name column carries an opaque background, and without clipping
        // its square corner paints over the card's 16px radius.
        <Card className="overflow-hidden">
          <CardBody className="p-0">
            {/* One column per field, so a value can be read down the page
                instead of hunted for among the chips on each row. Six columns
                plus the row actions do not fit a phone, so the table scrolls
                sideways rather than dropping columns — same idiom as the RSVP
                matrix, name column pinned so a scrolled row still says who it
                belongs to.

                border-separate, and every rule drawn on the cells rather than
                with divide-y on the rows: under border-collapse the borders
                belong to the table and paint ABOVE cell backgrounds, so the
                rows sliding under the pinned name column leave their dividers
                showing through it. Row borders are not painted at all in
                separate-borders mode, which is why the dividers sit on the
                cells here. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-stone-700 [&>th]:border-b [&>th]:border-stone-200">
                    {/* stone-700, not the 500 this kind of chrome usually
                        takes: 500 measures 3.2:1 on white, under the 4.5 floor
                        for text this small.

                        w-full on the name and w-px on the rest is the usual
                        table trick for "size every column to its content and
                        give the slack to this one" — without it the slack lands
                        on the last column and the row actions float a screen
                        width away from the row they act on. */}
                    <th scope="col" className="sticky left-0 z-10 w-full bg-white px-4 py-2 font-medium">
                      {t("guests.fullName")}
                    </th>
                    <th scope="col" className="w-px whitespace-nowrap px-3 py-2 font-medium">{t("guests.side")}</th>
                    <th scope="col" className="w-px whitespace-nowrap px-3 py-2 font-medium">{t("guests.country")}</th>
                    <th scope="col" className="w-px whitespace-nowrap px-3 py-2 font-medium">{t("guests.category")}</th>
                    <th scope="col" className="w-px whitespace-nowrap px-3 py-2 text-right font-medium">
                      {t("guests.partySize")}
                    </th>
                    <th scope="col" className="w-px whitespace-nowrap px-3 py-2 font-medium">{t("guests.events")}</th>
                    {/* The actions column has no heading to print, but an empty
                        <th> is announced as a blank column. */}
                    <th scope="col" className="w-px px-4 py-2">
                      <span className="sr-only">{t("guests.rowActions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((g) => (
                    <tr
                      key={g.id}
                      className="group align-middle [&>td]:border-b [&>td]:border-stone-100 last:[&>td]:border-b-0"
                    >
                      <td className="sticky left-0 z-10 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-600">
                            {initials(g.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-stone-900">{g.full_name}</span>
                              <InviteChip t={t} value={g.invite_or_not} />
                            </div>
                            {/* Dietary needs and the plus-one's name have no
                                column of their own, so they stay with the
                                person they describe rather than being dropped.
                                The name sits outside a Badge on purpose: Badge
                                is 11px mono chrome, which mangles Vietnamese
                                diacritics and CJK. */}
                            {(g.plus_one && g.plus_one_name) || (g.dietary || []).length > 0 ? (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {g.plus_one && g.plus_one_name && (
                                  <span className="text-xs text-stone-500">+ {g.plus_one_name}</span>
                                )}
                                {(g.dietary || []).map((d) => (
                                  <Badge key={d} tone="kk">
                                    {t(`guests.diet.${d}`)}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {/* side is NULL on a couple of live rows; Cell prints
                            the em dash rather than the raw key path. */}
                        <Cell t={t} group="sides" value={g.side} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <Cell t={t} group="countries" value={g.country} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <Cell t={t} group="categories" value={g.category} />
                      </td>
                      {/* The head count the app counts by, not the raw column —
                          the same number the export writes and the summary
                          cards total. Where it was never recorded it is the 1
                          or 2 the plus-one rule infers, and greyed to say so:
                          the column has a number on every row, but only the
                          dark ones were actually answered. */}
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className={g.party_size ? "text-stone-800" : "text-stone-400"}>
                          {headcount(g)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
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
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex shrink-0 justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <IconBtn label={t("common.edit")} onClick={() => openEdit(g)}><Icon name="edit" size={15} /></IconBtn>
                          <IconBtn label={t("common.delete")} onClick={() => handleDelete(g)}><Icon name="trash" size={15} /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
function Stat({ label, value, sub, tone = "stone", metric, active = false, onClick }) {
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
      {/* Plain sans, not the mono chrome class: this line is translated content
          ("12 người", "12 人"), which tracking-chrome mangles. */}
      {sub ? <p className="font-sans text-xs text-stone-500">{sub}</p> : null}
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

        {/* Attending heads. Sits after the plus-one pair because its floor
            depends on them: ticking the box lifts min to 2, and handleSave and
            saveGuest both raise a smaller number rather than store a row whose
            count and "+1" chip disagree. Blank stays blank — an unanswered
            invitation has no head count yet. */}
        <div>
          <label className="label" htmlFor="party-size">
            {t("guests.partySize")}
          </label>
          <input
            id="party-size"
            className="input"
            type="number"
            inputMode="numeric"
            min={minPartySize(form)}
            max={40}
            placeholder={t("guests.unset")}
            value={form.party_size}
            onChange={set("party_size")}
          />
          <p className="mt-1 text-xs text-stone-500">
            {t("guests.partySizeHint", {
              name: form.full_name.trim() || t("guests.partySizeThisGuest"),
            })}
          </p>
        </div>

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
