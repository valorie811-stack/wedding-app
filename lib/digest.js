import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_RSVP, SEED_EVENTS, SEED_TASKS } from "@/lib/seed-data";

// Palette for HTML email. Email clients do not process Tailwind and many strip
// <style> blocks, so colour has to stay inline — but the values come from the
// shared token module rather than being written by hand.
import tokens from "@/lib/tokens";
const C = {
  page: tokens.stone[50],
  ink: tokens.stone[900],
  body: tokens.stone[700],
  sub: tokens.stone[600],
  muted: tokens.stone[400],
  line: tokens.stone[200],
  gold: tokens.gold[600],
  ok: tokens.matcha[700],
  warn: tokens.gold[700],
  bad: tokens.hp[700],
};


const one = (rel) => (Array.isArray(rel) ? rel[0] : rel);
const WEDDING_LABEL = { HP: "Hải Phòng 🇻🇳", KK: "Kota Kinabalu 🇲🇾" };

function fmt(d) {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
  } catch {
    return d;
  }
}

// Gather the figures for the digest (admin client when available, else seed).
async function gather() {
  const admin = createAdminClient();
  if (admin) {
    try {
      const [r, t, e] = await Promise.all([
        admin.from("guest_events").select("rsvp_status,event:events(wedding:weddings(code))"),
        admin.from("tasks").select("title,due_date,status,wedding:weddings(code)"),
        admin.from("events").select("name_en,event_date,wedding:weddings(code)"),
      ]);
      if (!r.error) {
        return {
          rsvp: (r.data || []).map((x) => ({ code: one(one(x.event)?.wedding)?.code, status: x.rsvp_status })),
          tasks: (t.data || []).map((x) => ({ code: one(x.wedding)?.code ?? null, title: x.title, due: x.due_date, status: x.status })),
          events: (e.data || []).map((x) => ({ code: one(x.wedding)?.code, name: x.name_en, date: x.event_date })),
          live: true,
        };
      }
    } catch {
      /* fall through */
    }
  }
  return {
    rsvp: SEED_RSVP,
    tasks: SEED_TASKS.map((t) => ({ code: t.code, title: t.title, due: t.due, status: t.status })),
    events: SEED_EVENTS.map((e) => ({ code: e.code, name: e.name.en, date: e.date })),
    live: false,
  };
}

export async function buildDigestHtml() {
  const { rsvp, tasks, events, live } = await gather();
  const today = new Date();

  const byCode = {};
  for (const code of ["HP", "KK"]) byCode[code] = { confirmed: 0, pending: 0, declined: 0 };
  rsvp.forEach((r) => {
    if (byCode[r.code] && byCode[r.code][r.status] != null) byCode[r.code][r.status] += 1;
  });

  const upcomingTasks = tasks
    .filter((t) => t.status !== "done" && t.due && new Date(t.due) >= today)
    .sort((a, b) => String(a.due).localeCompare(b.due))
    .slice(0, 6);

  const nextEvents = events
    .filter((e) => e.date && new Date(e.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(b.date))
    .slice(0, 4);

  const rsvpRows = ["HP", "KK"]
    .map((code) => {
      const c = byCode[code];
      const total = c.confirmed + c.pending + c.declined;
      return `<tr>
        <td style="padding:6px 0;color:${C.ink};font-weight:600">${WEDDING_LABEL[code]}</td>
        <td style="padding:6px 0;text-align:right;color:${C.ok}">${c.confirmed} confirmed</td>
        <td style="padding:6px 0;text-align:right;color:${C.warn}">${c.pending} pending</td>
        <td style="padding:6px 0;text-align:right;color:${C.bad}">${c.declined} declined</td>
        <td style="padding:6px 0;text-align:right;color:${C.sub}">${total} invited</td>
      </tr>`;
    })
    .join("");

  const taskRows =
    upcomingTasks.map((t) => `<li style="margin:4px 0;color:${C.body}">${t.title} — <span style="color:${C.sub}">${fmt(t.due)}${t.code ? ` · ${t.code}` : ""}</span></li>`).join("") ||
    `<li style="color:${C.muted}">No open tasks 🎉</li>`;

  const eventRows =
    nextEvents.map((e) => `<li style="margin:4px 0;color:${C.body}">${e.name} — <span style="color:${C.sub}">${fmt(e.date)} · ${e.code}</span></li>`).join("") ||
    `<li style="color:${C.muted}">No upcoming events.</li>`;

  return `<!doctype html><html><body style="margin:0;background:${C.page};font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <p style="color:${C.gold};font-size:12px;letter-spacing:1px;margin:0">TWO WEDDINGS</p>
      <h1 style="font-size:22px;color:${C.ink};margin:4px 0 2px">Monthly RSVP digest</h1>
      <p style="color:${C.sub};font-size:13px;margin:0 0 20px">Where things stand across both celebrations.${live ? "" : " (sample data)"}</p>

      <div style="background:#fff;border:1px solid ${C.line};border-radius:14px;padding:16px;margin-bottom:16px">
        <h2 style="font-size:14px;color:${C.ink};margin:0 0 8px">RSVP status</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">${rsvpRows}</table>
      </div>

      <div style="background:#fff;border:1px solid ${C.line};border-radius:14px;padding:16px;margin-bottom:16px">
        <h2 style="font-size:14px;color:${C.ink};margin:0 0 8px">Upcoming tasks</h2>
        <ul style="margin:0;padding-left:18px;font-size:13px">${taskRows}</ul>
      </div>

      <div style="background:#fff;border:1px solid ${C.line};border-radius:14px;padding:16px">
        <h2 style="font-size:14px;color:${C.ink};margin:0 0 8px">Next events</h2>
        <ul style="margin:0;padding-left:18px;font-size:13px">${eventRows}</ul>
      </div>

      <p style="color:${C.muted};font-size:11px;text-align:center;margin-top:20px">Two Weddings planner · monthly digest</p>
    </div>
  </body></html>`;
}

// Send the digest to each recipient. No-ops (preview) when Resend isn't set up.
export async function sendDigest(recipients = []) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from || recipients.length === 0) {
    return { ok: true, preview: true, sent: 0, reason: "Resend not configured or no recipients" };
  }

  let Resend;
  try {
    ({ Resend } = await import("resend"));
  } catch {
    return { ok: false, error: "resend package not installed" };
  }

  const resend = new Resend(apiKey);
  const html = await buildDigestHtml();
  const subject = "Your monthly wedding RSVP digest";

  let sent = 0;
  for (const to of recipients) {
    try {
      await resend.emails.send({ from, to, subject, html });
      sent += 1;
    } catch {
      /* skip failed recipient */
    }
  }
  return { ok: true, preview: false, sent };
}
