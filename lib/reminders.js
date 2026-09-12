import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_TASKS } from "@/lib/seed-data";
import { sendEmail, notifyRecipients, emailShell, escapeHtml as esc } from "@/lib/email";
import tokens from "@/lib/tokens";

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

  // Calendar-day strings on both sides of the window, matching lib/digest.js.
  // setHours(0,0,0,0) is local midnight while a Date built from "YYYY-MM-DD" is
  // UTC midnight: the two agree on a UTC server and disagree west of it, where
  // a task due today would fall out of its own reminder window.
  const todayStr = new Date().toISOString().slice(0, 10);
  const limitStr = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const due = tasks
    .filter((t) => t.status !== "done" && t.due && String(t.due) >= todayStr && String(t.due) <= limitStr)
    .sort((a, b) => String(a.due).localeCompare(b.due));

  if (due.length === 0) return { ok: true, sent: 0, reason: "nothing due" };

  const rows = due
    .map((t) => `<li style="margin:5px 0">${esc(t.title)} — <span style="color:${tokens.stone[600]}">${esc(fmt(t.due))}${t.code ? ` · ${esc(t.code)}` : ""}${t.assignee ? ` · ${esc(t.assignee)}` : ""}</span></li>`)
    .join("");
  const html = emailShell(`Tasks due in the next ${days} days`, `<ul style="padding-left:18px;margin:0">${rows}</ul>`);

  let sent = 0;
  for (const r of to) {
    const res = await sendEmail({ to: r, subject: `${due.length} wedding task(s) due soon`, html });
    if (res.ok && !res.preview) sent += 1;
  }
  return { ok: true, sent };
}
