import { sendDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Triggered monthly by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set; a `?key=`
// param is accepted for manual runs. If no secret is configured the endpoint
// is open but harmless (it only sends when Resend + recipients are set).
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    const key = new URL(req.url).searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const recipients = (process.env.DIGEST_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await sendDigest(recipients);
  return Response.json(result);
}
