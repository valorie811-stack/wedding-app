import "server-only";

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


// Shared email transport (Resend). All email features funnel through here so
// they degrade the same way: a no-op "preview" result when unconfigured.
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

// Recipients for couple/planner notifications (monthly digest, RSVP alerts,
// task reminders). Comma-separated in DIGEST_RECIPIENTS.
export function notifyRecipients() {
  return (process.env.DIGEST_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from || !to || (Array.isArray(to) && to.length === 0)) {
    return { ok: true, preview: true };
  }
  try {
    const { Resend } = await import("resend");
    await new Resend(apiKey).emails.send({ from, to, subject, html });
    return { ok: true, preview: false };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Branded HTML wrapper for all outgoing email.
export function emailShell(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:${C.page};font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <p style="color:${C.gold};font-size:12px;letter-spacing:1px;margin:0">TWO WEDDINGS</p>
      <h1 style="font-size:20px;color:${C.ink};margin:4px 0 14px">${title}</h1>
      <div style="background:#fff;border:1px solid ${C.line};border-radius:14px;padding:16px;color:${C.body};font-size:14px">${bodyHtml}</div>
      <p style="color:${C.muted};font-size:11px;text-align:center;margin-top:22px">Hải Phòng 🇻🇳 · Kota Kinabalu 🇲🇾 · October 2027</p>
    </div></body></html>`;
}
