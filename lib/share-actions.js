"use server";

import { createClient } from "@/lib/supabase/server";
import { makeRandomToken, encodePreviewToken } from "@/lib/share";

// Create a share link. Live: random token stored in `shares`. Preview: a
// self-encoding token (no DB) so the link still resolves with no keys.
export async function createShare({ resource, scope = "BOTH", expMs = null, label = "", otp = false }) {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: true, preview: true, token: encodePreviewToken({ resource, scope, expMs, label, otp }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = makeRandomToken();
  const row = {
    token,
    resource,
    scope,
    label: label || null,
    otp_required: !!otp,
    created_by: user?.id ?? null,
    expires_at: expMs ? new Date(expMs).toISOString() : null,
  };
  const { data, error } = await supabase.from("shares").insert(row).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, preview: false, token, id: data?.id };
}

// Active (non-revoked) shares for the management list.
export async function listShares(resource = null) {
  const supabase = await createClient();
  if (!supabase) return { shares: [], preview: true };
  let q = supabase
    .from("shares")
    .select("id,token,resource,scope,label,expires_at,created_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (resource) q = q.eq("resource", resource);
  const { data, error } = await q;
  if (error) return { shares: [], preview: false, error: error.message };
  return { shares: data || [], preview: false };
}

export async function revokeShare(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const { error } = await supabase.from("shares").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, preview: false };
}
