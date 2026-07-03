"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WEDDINGS } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { saveTask, updateTaskStatus, deleteTask } from "@/app/(app)/planning/actions";
import TaskForm from "@/components/planning/TaskForm";

const COLUMNS = ["todo", "in_progress", "done"];
const COL_ACCENT = {
  todo: "border-t-ink-300",
  in_progress: "border-t-gold-400",
  done: "border-t-kk-400",
};

const blank = { id: null, code: "HP", title: "", due: "", assignee: "", status: "todo" };

function fmtDate(date, locale) {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(
      locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB",
      { day: "numeric", month: "short", year: "numeric" }
    ).format(new Date(date));
  } catch {
    return date;
  }
}

export default function PlanningView({ tasks: initial, preview }) {
  const { t, scope, locale } = useApp();
  const [tasks, setTasks] = useState(initial);
  const [form, setForm] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  // Shared (code null) tasks belong to both weddings → always visible.
  const visible = useMemo(
    () => tasks.filter((t) => scope === "BOTH" || t.code === scope || t.code == null),
    [tasks, scope]
  );

  const columns = useMemo(() => {
    const map = { todo: [], in_progress: [], done: [] };
    visible.forEach((task) => {
      (map[task.status] || map.todo).push(task);
    });
    // Sort each column by due date (undated last).
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.due || "2100-01-01") - new Date(b.due || "2100-01-01"))
    );
    return map;
  }, [visible]);

  function moveTask(id, status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    updateTaskStatus(id, status).catch(() => {});
  }

  function onDrop(status) {
    if (dragId) moveTask(dragId, status);
    setDragId(null);
    setOverCol(null);
  }

  function openNew() {
    setForm({ ...blank, code: scope === "KK" ? "KK" : scope === "HP" ? "HP" : "HP" });
  }
  function openEdit(task) {
    setForm({
      id: task.id,
      code: task.code,
      title: task.title,
      due: task.due || "",
      assignee: task.assignee || "",
      status: task.status,
    });
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const payload = {
      id: form.id,
      code: form.code || null,
      title: form.title.trim(),
      due: form.due || null,
      assignee: form.assignee.trim(),
      status: form.status,
    };
    setTasks((prev) => {
      if (form.id) return prev.map((t) => (t.id === form.id ? { ...t, ...payload } : t));
      return [...prev, { ...payload, id: crypto.randomUUID() }];
    });
    setForm(null);
    saveTask(payload).catch(() => {});
  }

  function handleDelete(task) {
    if (!window.confirm(t("planning.deleteConfirm"))) return;
    setTasks((prev) => prev.filter((x) => x.id !== task.id));
    deleteTask(task.id).catch(() => {});
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{t("planning.title")}</h1>
          <p className="mt-0.5 text-sm text-ink-500">{t("planning.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {preview && <Badge tone="amber">⚠️ {t("common.preview")}</Badge>}
          <Button variant="gold" onClick={openNew}>
            + {t("planning.addTask")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={() => onDrop(col)}
            className={`rounded-2xl border-t-4 bg-ink-50/60 p-3 transition ${COL_ACCENT[col]} ${
              overCol === col ? "ring-2 ring-gold-300" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-ink-700">{t(`planning.columns.${col}`)}</h2>
              <span className="rounded-full bg-ink-200 px-2 py-0.5 text-xs font-medium text-ink-600">
                {columns[col].length}
              </span>
            </div>
            <div className="space-y-2.5">
              {columns[col].map((task) => {
                const overdue = task.due && new Date(task.due) < today && task.status !== "done";
                const w = task.code ? WEDDINGS[task.code] : null;
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={`card group cursor-grab p-3 active:cursor-grabbing ${
                      dragId === task.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-800">{task.title}</p>
                      {w ? (
                        <Badge tone={task.code === "HP" ? "hp" : "kk"}>{task.code}</Badge>
                      ) : (
                        <Badge tone="gold">↔</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                      {task.due && (
                        <span className={overdue ? "font-medium text-red-600" : ""}>
                          📅 {fmtDate(task.due, locale)}
                          {overdue ? ` · ${t("planning.overdue")}` : ""}
                        </span>
                      )}
                      {task.assignee && <span>👤 {task.assignee}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2">
                      <select
                        value={task.status}
                        onChange={(e) => moveTask(task.id, e.target.value)}
                        className="rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-xs text-ink-600"
                        aria-label={t("planning.taskTitle")}
                      >
                        {COLUMNS.map((c) => (
                          <option key={c} value={c}>
                            {t(`planning.columns.${c}`)}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(task)}
                          aria-label={t("common.edit")}
                          className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(task)}
                          aria-label={t("common.delete")}
                          className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-red-50 hover:text-red-600"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {columns[col].length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-ink-400">{t("planning.noTasks")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskForm form={form} setForm={setForm} onSave={handleSave} onClose={() => setForm(null)} t={t} />
    </div>
  );
}
