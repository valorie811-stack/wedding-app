"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WEDDINGS } from "@/lib/theme";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EventForm, { blankEvent } from "@/components/calendar/EventForm";
import TaskForm from "@/components/planning/TaskForm";
import { saveEvent, deleteEvent } from "@/app/(app)/scheduler/actions";
import { saveTask, deleteTask } from "@/app/(app)/planning/actions";
import { buildICS } from "@/lib/ics";
import { downloadICS } from "@/lib/export";
import { expandTaskOccurrences, isReminding } from "@/lib/recurrence";
import tokens from "@/lib/tokens";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
};

function monthTitle(year, month, locale) {
  try {
    return new Intl.DateTimeFormat(
      locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB",
      { month: "long", year: "numeric" }
    ).format(new Date(year, month, 1));
  } catch {
    return `${year}-${pad(month + 1)}`;
  }
}

export default function CalendarView({ events: initialEvents, tasks: initialTasks, preview }) {
  const { t, scope, locale } = useApp();

  // Local optimistic copies so add/edit/remove reflect immediately (and still
  // work in preview/seed mode, where the server action is a no-op).
  const [events, setEvents] = useState(initialEvents);
  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState(null);
  const [taskForm, setTaskForm] = useState(null);
  const [dragItem, setDragItem] = useState(null); // { kind, id } being rescheduled
  const [dragOverDate, setDragOverDate] = useState(null);

  const sharedVisible = (code) => scope === "BOTH" || code === scope || code == null;

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const taskById = useMemo(() => new Map(tasks.map((tk) => [tk.id, tk])), [tasks]);

  // Normalize events + task milestones into a single dated-item list.
  const items = useMemo(() => {
    const evItems = events
      .filter((e) => sharedVisible(e.code))
      .filter((e) => e.date)
      .map((e) => ({
        kind: "event",
        id: e.id,
        date: e.date,
        code: e.code,
        title: e.name?.[locale] || e.name?.en,
        start: e.start,
        end: e.end,
        location: e.location,
        halal: e.halal,
        type: e.type,
      }));
    // Expand recurring milestones into per-date occurrences within a window
    // spanning ~1 month back to ~18 months ahead (covers month navigation).
    const now = todayStr();
    const back = new Date();
    back.setDate(back.getDate() - 31);
    const ahead = new Date();
    ahead.setDate(ahead.getDate() + 540);
    const rangeStart = ymd(back.getFullYear(), back.getMonth(), back.getDate());
    const rangeEnd = ymd(ahead.getFullYear(), ahead.getMonth(), ahead.getDate());
    const taskItems = tasks
      .filter((t) => sharedVisible(t.code))
      .filter((t) => t.due)
      .flatMap((t) => {
        // Non-recurring milestones always show (no windowing regression);
        // recurring ones expand into occurrences within the window.
        const dates = t.recurFreq
          ? expandTaskOccurrences(
              { due: t.due, recurFreq: t.recurFreq, recurUntil: t.recurUntil },
              rangeStart,
              rangeEnd
            )
          : [t.due];
        return dates.map((date) => ({
          kind: "milestone",
          id: t.id,
          date,
          code: t.code,
          title: t.title,
          assignee: t.assignee,
          status: t.status,
          recurring: !!t.recurFreq,
          recurFreq: t.recurFreq,
          remindDays: t.remindDays,
          reminding: isReminding(date, t.remindDays, t.status, now),
        }));
      });
    return [...evItems, ...taskItems];
  }, [events, tasks, scope, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDate = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      if (!map.has(it.date)) map.set(it.date, []);
      map.get(it.date).push(it);
    });
    return map;
  }, [items]);

  // Default to the month of the nearest upcoming item (else today's month).
  const initial = useMemo(() => {
    const tStr = todayStr();
    const future = items.map((i) => i.date).filter((d) => d >= tStr).sort();
    const base = future[0] || tStr;
    const [y, m] = base.split("-").map(Number);
    return { year: y, month: m - 1 };
  }, [items]);

  const [view, setView] = useState(initial);
  const [selected, setSelected] = useState(null);

  const { year, month } = view;
  const startIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startIndex).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekdays = t("calendar.weekdays");
  const tStr = todayStr();

  function shift(delta) {
    setSelected(null);
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function goToday() {
    const d = new Date();
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(todayStr());
  }

  const selectedItems = selected ? byDate.get(selected) || [] : [];

  // --- add / edit / remove -------------------------------------------------
  function openNew(dateStr) {
    setForm({
      ...blankEvent(),
      date: dateStr || selected || tStr,
      code: scope === "BOTH" ? "" : scope,
    });
  }
  function openEdit(id) {
    const e = eventById.get(id);
    if (!e) return;
    setForm({
      id: e.id,
      code: e.code || "",
      name: { en: e.name?.en || "", vi: e.name?.vi || "", zh: e.name?.zh || "" },
      date: e.date || "",
      start: (e.start || "").slice(0, 5),
      end: (e.end || "").slice(0, 5),
      location: e.location || "",
      type: e.type || "ceremony",
      dress: e.dress || "",
      halal: !!e.halal,
      notes: e.notes || "",
    });
  }
  function handleSave() {
    if (!form.name.en.trim()) return;
    const payload = {
      ...form,
      code: form.code || null,
      name: { ...form.name, en: form.name.en.trim() },
    };
    setEvents((prev) => {
      if (form.id) return prev.map((e) => (e.id === form.id ? { ...e, ...payload } : e));
      return [...prev, { ...payload, id: crypto.randomUUID() }];
    });
    setForm(null);
    saveEvent({ ...payload, id: form.id }).catch(() => {});
  }
  function handleDelete(id) {
    if (!window.confirm(t("calendar.deleteConfirm"))) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setForm(null);
    deleteEvent(id).catch(() => {});
  }

  // --- task milestones (reuses the planning TaskForm + actions) ------------
  function openNewTask(dateStr) {
    setTaskForm({
      id: null,
      code: scope === "BOTH" ? "" : scope,
      title: "",
      due: dateStr || selected || tStr,
      assignee: "",
      status: "todo",
      recurFreq: "",
      recurUntil: "",
      remindDays: "",
    });
  }
  function openEditTask(id) {
    const tk = taskById.get(id);
    if (!tk) return;
    setTaskForm({
      id: tk.id,
      code: tk.code || "",
      title: tk.title || "",
      due: tk.due || "",
      assignee: tk.assignee || "",
      status: tk.status || "todo",
      recurFreq: tk.recurFreq || "",
      recurUntil: tk.recurUntil || "",
      remindDays: tk.remindDays == null ? "" : tk.remindDays,
    });
  }
  function handleSaveTask() {
    if (!taskForm.title.trim()) return;
    const remindDays =
      taskForm.remindDays === "" || taskForm.remindDays == null ? null : Number(taskForm.remindDays);
    const payload = {
      id: taskForm.id,
      code: taskForm.code || null,
      title: taskForm.title.trim(),
      due: taskForm.due || null,
      assignee: (taskForm.assignee || "").trim(),
      status: taskForm.status,
      recurFreq: taskForm.recurFreq || null,
      recurUntil: taskForm.recurFreq && taskForm.recurUntil ? taskForm.recurUntil : null,
      remindDays,
    };
    setTasks((prev) => {
      if (taskForm.id) return prev.map((tk) => (tk.id === taskForm.id ? { ...tk, ...payload } : tk));
      return [...prev, { ...payload, id: crypto.randomUUID() }];
    });
    setTaskForm(null);
    saveTask(payload).catch(() => {});
  }
  function handleDeleteTask(id) {
    if (!window.confirm(t("planning.deleteConfirm"))) return;
    setTasks((prev) => prev.filter((tk) => tk.id !== id));
    setTaskForm(null);
    deleteTask(id).catch(() => {});
  }

  // --- drag-to-reschedule --------------------------------------------------
  // Recurring occurrences aren't draggable (would ambiguously shift the series).
  function itemDraggable(it) {
    if (it.id == null) return false;
    if (it.kind === "milestone") return !it.recurring;
    return it.kind === "event";
  }
  function handleReschedule(item, dateStr) {
    setDragItem(null);
    setDragOverDate(null);
    if (!item || !dateStr) return;
    if (item.kind === "event") {
      const ev = eventById.get(item.id);
      if (!ev || ev.date === dateStr) return;
      setEvents((prev) => prev.map((e) => (e.id === item.id ? { ...e, date: dateStr } : e)));
      saveEvent({ ...ev, code: ev.code || null, date: dateStr }).catch(() => {});
    } else if (item.kind === "milestone") {
      const tk = taskById.get(item.id);
      if (!tk || tk.due === dateStr) return;
      setTasks((prev) => prev.map((x) => (x.id === item.id ? { ...x, due: dateStr } : x)));
      saveTask({ ...tk, code: tk.code || null, due: dateStr }).catch(() => {});
    }
  }

  // --- export --------------------------------------------------------------
  function handleExport() {
    const scoped = events.filter((e) => sharedVisible(e.code) && e.date);
    const labels = {
      ceremony: t("calendar.types.ceremony"),
      reception: t("calendar.types.reception"),
      gathering: t("calendar.types.gathering"),
      other: t("calendar.types.other"),
      dressCode: t("calendar.form.dressCode"),
      halal: t("calendar.form.halal"),
    };
    const ics = buildICS(scoped, { locale, labels, calendarName: t("calendar.title") });
    const suffix = scope === "BOTH" ? "" : `-${scope}`;
    downloadICS(ics, `wedding-schedule${suffix}.ics`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("calendar.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("calendar.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber">⚠️ {t("common.preview")}</Badge>}
          <Button as="a" href={`/api/pdf/runsheet?scope=${scope}`} target="_blank" rel="noopener" variant="outline">
            ⬇ PDF
          </Button>
          <Button variant="outline" onClick={handleExport} title={t("calendar.exportHint")}>
            📅 {t("calendar.export")}
          </Button>
          <Button variant="gold" onClick={() => openNew()}>
            + {t("calendar.addEvent")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                aria-label="Previous month"
                className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
              >
                ‹
              </button>
              <button
                onClick={() => shift(1)}
                aria-label="Next month"
                className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
              >
                ›
              </button>
              <h2 className="ml-2 font-serif text-lg font-semibold text-stone-900">
                {monthTitle(year, month, locale)}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={goToday}>
              {t("calendar.today")}
            </Button>
          </div>
          <CardBody>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400">
              {weekdays.map((d) => (
                <div key={d} className="pb-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`b${i}`} className="aspect-square" />;
                const dateStr = ymd(year, month, day);
                const dayItems = byDate.get(dateStr) || [];
                const isToday = dateStr === tStr;
                const isSel = dateStr === selected;
                const isDropTarget = dragItem && dragOverDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelected(isSel ? null : dateStr)}
                    onDragOver={(e) => {
                      if (dragItem) {
                        e.preventDefault();
                        if (dragOverDate !== dateStr) setDragOverDate(dateStr);
                      }
                    }}
                    onDragLeave={() => setDragOverDate((d) => (d === dateStr ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleReschedule(dragItem, dateStr);
                    }}
                    className={`flex aspect-square flex-col items-center rounded-lg border p-1 text-left transition ${
                      isDropTarget
                        ? "border-gold-400 bg-gold-50 ring-2 ring-gold-300"
                        : isSel
                          ? "border-gold-400 bg-gold-50"
                          : dayItems.length
                            ? "border-stone-200 bg-white hover:border-stone-300"
                            : "border-transparent hover:bg-stone-50"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                        isToday ? "bg-stone-900 font-semibold text-white" : "text-stone-600"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {dayItems.slice(0, 4).map((it, j) => {
                        const drag = itemDraggable(it);
                        return (
                          <span
                            key={j}
                            draggable={drag}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDragItem({ kind: it.kind, id: it.id });
                            }}
                            className={`h-1.5 w-1.5 rounded-full ${drag ? "cursor-grab" : ""} ${
                              it.reminding ? "ring-1 ring-amber-400" : ""
                            }`}
                            style={{ background: dotColor(it) }}
                            title={it.title}
                          />
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
              <LegendDot color={WEDDINGS.HP.hex.base} label={`${WEDDINGS.HP.flag} ${t("scope.HP")}`} />
              <LegendDot color={WEDDINGS.KK.hex.base} label={`${WEDDINGS.KK.flag} ${t("scope.KK")}`} />
              <LegendDot color={tokens.gold[500]} label={t("calendar.milestones")} />
            </div>
          </CardBody>
        </Card>

        {/* Day detail */}
        <Card>
          <CardHeader
            title={selected ? formatLong(selected, locale) : t("calendar.upcoming")}
            subtitle={selected ? undefined : t("calendar.selectDay")}
          />
          <CardBody className="pt-0">
            {selected ? (
              <>
                {selectedItems.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-400">{t("calendar.nothing")}</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedItems.map((it, i) => (
                      <DetailRow
                        key={i}
                        it={it}
                        t={t}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onEditTask={openEditTask}
                        onDeleteTask={handleDeleteTask}
                        canDrag={itemDraggable(it)}
                        onDragStartItem={(x) => setDragItem({ kind: x.kind, id: x.id })}
                      />
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => openNew(selected)}>
                    + {t("calendar.addOnDay")}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => openNewTask(selected)}>
                    + {t("calendar.addMilestoneOnDay")}
                  </Button>
                </div>
              </>
            ) : (
              <UpcomingList items={items} tStr={tStr} t={t} locale={locale} onPick={(d) => {
                const [y, m] = d.split("-").map(Number);
                setView({ year: y, month: m - 1 });
                setSelected(d);
              }} />
            )}
          </CardBody>
        </Card>
      </div>

      <EventForm
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setForm(null)}
        t={t}
      />

      <TaskForm
        form={taskForm}
        setForm={setTaskForm}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onClose={() => setTaskForm(null)}
        t={t}
      />
    </div>
  );
}

function dotColor(it) {
  if (it.kind === "milestone") return tokens.gold[500];
  return it.code === "HP" ? WEDDINGS.HP.hex.base : WEDDINGS.KK.hex.base;
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function formatLong(dateStr, locale) {
  try {
    return new Intl.DateTimeFormat(
      locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    ).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function DetailRow({ it, t, onEdit, onDelete, onEditTask, onDeleteTask, canDrag, onDragStartItem }) {
  const isEvent = it.kind === "event";
  const editHandler = isEvent ? onEdit : onEditTask;
  const deleteHandler = isEvent ? onDelete : onDeleteTask;
  const editable = it.id != null && !!editHandler;
  const edit = () => editHandler(it.id);
  const del = () => deleteHandler?.(it.id);
  return (
    <li
      draggable={!!canDrag}
      onDragStart={() => canDrag && onDragStartItem?.(it)}
      className={`group flex gap-3 ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: dotColor(it) }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editable ? (
            <button
              onClick={edit}
              className="text-left text-sm font-medium text-stone-800 hover:text-stone-950 hover:underline"
            >
              {it.title}
            </button>
          ) : (
            <p className="text-sm font-medium text-stone-800">{it.title}</p>
          )}
          {it.reminding && <span title={t("planning.reminder")}>🔔</span>}
          {it.recurring && (
            <span title={t(`planning.recur.${it.recurFreq}`)} className="text-stone-400">
              🔁
            </span>
          )}
          {it.halal && <Badge tone="green">{t("vendors.halal")}</Badge>}
        </div>
        {isEvent ? (
          <p className="text-xs text-stone-500">
            {it.start ? `${it.start.slice(0, 5)}${it.end ? `–${it.end.slice(0, 5)}` : ""}` : t("calendar.allDay")}
            {it.location ? ` · ${it.location}` : ""}
          </p>
        ) : (
          <p className="text-xs text-stone-500">
            {t("calendar.milestone")}
            {it.assignee ? ` · ${it.assignee}` : ""}
            {it.status ? ` · ${t(`planning.columns.${it.status}`)}` : ""}
            {it.recurFreq ? ` · 🔁 ${t(`planning.recur.${it.recurFreq}`)}` : ""}
            {it.remindDays != null ? ` · 🔔 ${t("planning.remindDays", { n: it.remindDays })}` : ""}
          </p>
        )}
      </div>
      {it.code && <Badge tone={it.code === "HP" ? "hp" : "kk"}>{it.code}</Badge>}
      {editable && (
        <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={edit}
            aria-label={t("common.edit")}
            title={t("common.edit")}
            className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            ✎
          </button>
          <button
            onClick={del}
            aria-label={t("common.delete")}
            title={t("common.delete")}
            className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-red-600"
          >
            🗑
          </button>
        </div>
      )}
    </li>
  );
}

function UpcomingList({ items, tStr, t, locale, onPick }) {
  const upcoming = items
    .filter((i) => i.date >= tStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  if (upcoming.length === 0) {
    return <p className="py-6 text-center text-sm text-stone-400">{t("calendar.nothing")}</p>;
  }
  return (
    <ul className="space-y-2">
      {upcoming.map((it, i) => (
        <li key={i}>
          <button
            onClick={() => onPick(it.date)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-stone-50"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dotColor(it) }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-stone-800">
                {it.title}
                {it.reminding ? " 🔔" : ""}
                {it.recurring ? " 🔁" : ""}
              </p>
              <p className="text-xs text-stone-500">{formatShort(it.date, locale)}</p>
            </div>
            {it.code && <Badge tone={it.code === "HP" ? "hp" : "kk"}>{it.code}</Badge>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatShort(dateStr, locale) {
  try {
    return new Intl.DateTimeFormat(
      locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB",
      { day: "numeric", month: "short", year: "numeric" }
    ).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}
