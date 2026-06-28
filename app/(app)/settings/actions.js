"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { makeRandomToken } from "@/lib/share";

const isSeed = (id) => !id || String(id).startsWith("seed-");
const refresh = () => revalidatePath("/settings");

export async function updateMemberRole(id, role) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("members").update({ role }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}

export async function removeMember(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}

export async function createInvite({ email, role }) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      email: (email || "").toLowerCase().trim(),
      role: role || "guest",
      token: makeRandomToken(),
      invited_by: user?.id ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false, id: data?.id };
}

export async function revokeInvite(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("invites").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}
