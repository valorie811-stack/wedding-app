"use client";

import { useState } from "react";
import { makeT } from "@/lib/i18n";
import { WEDDINGS } from "@/lib/theme";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { submitRsvp } from "@/lib/rsvp-actions";

const SIDES = ["bride", "groom", "both"];
const DIET = ["halal", "vegetarian", "vegan", "gluten-free"];

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

export default function PublicRsvpForm({ token, events, locale = "en" }) {
  // Build the translator locally — a `t` function can't be passed across the
  // server/client boundary, so the client rebuilds it from the locale string.
  const t = makeT(locale);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    side: "both",
    plus_one: false,
    dietary: [],
  });
  const [sel, setSel] = useState(() => Object.fromEntries(events.map((e) => [e.id, false])));
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  function toggleDiet(d) {
    setForm((f) => ({
      ...f,
      dietary: f.dietary.includes(d) ? f.dietary.filter((x) => x !== d) : [...f.dietary, d],
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setErr(t("rsvpForm.nameRequired"));
      return;
    }
    setErr("");
    setStatus("submitting");
    const selections = events.map((ev) => ({ event_id: ev.id, attending: !!sel[ev.id] }));
    try {
      const res = await submitRsvp({ token, ...form, selections });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="card px-6 py-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl">
          🎉
        </div>
        <h2 className="font-serif text-xl font-semibold text-ink-900">{t("rsvpForm.thankYouTitle")}</h2>
        <p className="mt-2 text-sm text-ink-500">{t("rsvpForm.thankYouBody")}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card px-6 py-10 text-center text-sm text-ink-400">{t("rsvpForm.noEvents")}</div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm text-ink-500">{t("rsvpForm.intro")}</p>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">{t("rsvpForm.fullName")}</label>
          <input className="input" value={form.full_name} onChange={set("full_name")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("rsvpForm.email")}</label>
            <input className="input" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label">{t("rsvpForm.phone")}</label>
            <input className="input" value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div>
          <label className="label">{t("rsvpForm.side")}</label>
          <select className="input" value={form.side} onChange={set("side")}>
            {SIDES.map((s) => (
              <option key={s} value={s}>{t(`guests.sides.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-event attendance */}
      <div className="card p-5">
        <p className="label">{t("rsvpForm.willAttend")}</p>
        <ul className="divide-y divide-ink-100">
          {events.map((ev) => {
            const w = ev.code ? WEDDINGS[ev.code] : null;
            const attending = !!sel[ev.id];
            return (
              <li key={ev.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">
                      {ev.name?.[locale] || ev.name?.en}
                    </span>
                    {w && <Badge tone={ev.code === "HP" ? "hp" : "kk"}>{ev.code}</Badge>}
                  </div>
                  <p className="text-xs text-ink-500">{fmtDate(ev.date, locale)}</p>
                </div>
                <div className="flex shrink-0 overflow-hidden rounded-lg border border-ink-200">
                  <button
                    type="button"
                    onClick={() => setSel((s) => ({ ...s, [ev.id]: true }))}
                    className={`px-3 py-1.5 text-xs font-medium ${attending ? "bg-emerald-500 text-white" : "bg-white text-ink-500"}`}
                  >
                    {t("rsvpForm.yes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSel((s) => ({ ...s, [ev.id]: false }))}
                    className={`px-3 py-1.5 text-xs font-medium ${!attending ? "bg-ink-700 text-white" : "bg-white text-ink-500"}`}
                  >
                    {t("rsvpForm.no")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Dietary + plus one */}
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">{t("rsvpForm.dietary")}</label>
          <div className="flex flex-wrap gap-2">
            {DIET.map((d) => {
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
          {t("rsvpForm.plusOne")}
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {status === "error" && <p className="text-sm text-red-600">{t("rsvpForm.errorBody")}</p>}

      <Button type="submit" variant="gold" size="lg" disabled={status === "submitting"} className="w-full">
        {status === "submitting" ? t("rsvpForm.submitting") : t("rsvpForm.submit")}
      </Button>
    </form>
  );
}
