import { sendDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Triggered monthly by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set; a `?key=`
// param is accepted for manual runs.
//
// An unset CRON_SECRET now refuses rather than running open. It was documented
// as "open but harmless", which reads right until you notice the endpoint sends
// real email to a fixed recipient list on demand: anyone who finds the URL can
// mail the couple as often as they like. This path is in the middleware's
// PUBLIC_PREFIXES precisely because it is supposed to guard itself, so an
// absent secret is a misconfiguration, not a mode.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not configured; refusing to run." },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization") || "";
  const key = new URL(req.url).searchParams.get("key");
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const recipients = (process.env.DIGEST_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await sendDigest(recipients);
  return Response.json(result);
}
