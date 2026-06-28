import { sendReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Weekly task reminders (see vercel.json cron). Same auth as /api/digest:
// Vercel sends `Authorization: Bearer <CRON_SECRET>`; `?key=` works for manual
// runs; `?days=` overrides the look-ahead window.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    const key = url.searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  const days = Number(url.searchParams.get("days")) || 7;
  const result = await sendReminders(days);
  return Response.json(result);
}
