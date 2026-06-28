import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_TASKS } from "@/lib/seed-data";
import { sendEmail, notifyRecipients, emailShell } from "@/lib/email";

const one = (rel) => (Array.isArray(rel) ? rel[0] : rel);

function fmt(d) {
  try {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
  } catch {
    return d;
  }
}

// Email the couple/planner about tasks due within `days`. No-op when there are
// no recipients or nothing is due.
export async function sendReminders(days = 7) {
  const to = notifyRecipients();
  if (to.length === 0) return { ok: true, preview: true, sent: 0, reason: "no recipients" };

  const admin = createAdminClient();
  let tasks;
  if (admin) {
    const { data, error } = await admin.from("tasks").select("title,due_date,status,assignee,wedding:weddings(code)");
    if (error) return { ok: false, error: error.message };
    tasks = (data || []).map((t) => ({ code: one(t.wedding)?.code ?? null, title: t.title, due: t.due_date, status: t.status, assignee: t.assignee }));
  } else {
    tasks = SEED_TASKS.map((t) => ({ code: t.code, title: t.title, due: t.due, status: t.status, assignee: t.assignee }));
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now.getTime() + days * 86400000);
  const due = tasks
    .filter((t) => t.status !== "done" && t.due && new Date(t.due) >= now && new Date(t.due) <= limit)
    .sort((a, b) => String(a.due).localeCompare(b.due));

  if (due.length === 0) return { ok: true, sent: 0, reason: "nothing due" };

  const rows = due
    .map((t) => `<li style="margin:5px 0">${t.title} — <span style="color:#64748b">${fmt(t.due)}${t.code ? ` · ${t.code}` : ""}${t.assignee ? ` · ${t.assignee}` : ""}</span></li>`)
    .join("");
  const html = emailShell(`Tasks due in the next ${days} days`, `<ul style="padding-left:18px;margin:0">${rows}</ul>`);

  let sent = 0;
  for (const r of to) {
    const res = await sendEmail({ to: r, subject: `${due.length} wedding task(s) due soon`, html });
    if (res.ok && !res.preview) sent += 1;
  }
  return { ok: true, sent };
}
