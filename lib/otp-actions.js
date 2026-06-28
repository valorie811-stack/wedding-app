"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveShare } from "@/lib/share-data";

const cookieName = (token) => `share_otp_${token}`;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Request a one-time code for an OTP-gated share link. Emails it via Resend.
export async function requestShareOtp(token, email) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return { ok: false, error: "email_required" };

  const res = await resolveShare(token);
  if (res.status !== "ok" || !res.otp_required) return { ok: false, error: "not_required" };

  const admin = createAdminClient();
  if (!admin) return { ok: true, preview: true }; // can't send/store in preview

  const code = genCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await admin.from("share_otps").delete().eq("token", token).eq("email", e);
  const { error } = await admin.from("share_otps").insert({ token, email: e, code, expires_at: expires });
  if (error) return { ok: false, error: error.message };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (apiKey && from) {
    try {
      const { Resend } = await import("resend");
      await new Resend(apiKey).emails.send({
        from,
        to: e,
        subject: "Your access code",
        html: `<p style="font-family:Helvetica,Arial,sans-serif">Your one-time code is <b style="font-size:22px;letter-spacing:2px">${code}</b>.<br/>It expires in 10 minutes.</p>`,
      });
    } catch {
      /* code still stored; allow manual retry */
    }
  }
  return { ok: true, preview: false };
}

// Verify the code; on success set an httpOnly cookie scoped to the share.
export async function verifyShareOtp(token, email, code) {
  const e = (email || "").trim().toLowerCase();
  const c = (code || "").trim();
  const admin = createAdminClient();
  if (!admin) return { ok: true, preview: true };

  const { data } = await admin
    .from("share_otps")
    .select("id,expires_at")
    .eq("token", token)
    .eq("email", e)
    .eq("code", c)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { ok: false, error: "invalid_code" };
  if (new Date(data.expires_at) < new Date()) return { ok: false, error: "expired_code" };

  const jar = await cookies();
  jar.set(cookieName(token), e, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  await admin.from("share_otps").delete().eq("token", token).eq("email", e);
  return { ok: true, preview: false };
}
