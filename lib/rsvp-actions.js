"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveShare } from "@/lib/share-data";
import { sendEmail, notifyRecipients, emailConfigured, emailShell } from "@/lib/email";

// Public RSVP submission. The submitter is anonymous, so this uses the
// service-role client (bypasses RLS). In preview (no service role) it accepts
// the submission without persisting so the demo flow still completes.
// input: { token, full_name, email, phone, side, plus_one, dietary[],
//          selections: [{ event_id, attending }] }
export async function submitRsvp(input) {
  const res = await resolveShare(input.token);
  if (res.status !== "ok" || res.resource !== "rsvp") return { ok: false, error: res.status };
  if (!input.full_name || !input.full_name.trim()) return { ok: false, error: "name_required" };

  const admin = createAdminClient();
  if (!admin) return { ok: true, preview: true };

  const email = (input.email || "").trim();
  let guestId = null;
  if (email) {
    const { data } = await admin.from("guests").select("id").ilike("email", email).maybeSingle();
    guestId = data?.id ?? null;
  }

  const fields = {
    full_name: input.full_name.trim(),
    email: email || null,
    phone: input.phone || null,
    side: input.side || "both",
    plus_one: !!input.plus_one,
    dietary: input.dietary || [],
  };

  if (guestId) {
    const { error } = await admin.from("guests").update(fields).eq("id", guestId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await admin.from("guests").insert(fields).select("id").maybeSingle();
    if (error) return { ok: false, error: error.message };
    guestId = data?.id;
  }
  if (!guestId) return { ok: false, error: "no_guest" };

  const rows = (input.selections || [])
    .filter((s) => s.event_id)
    .map((s) => ({
      guest_id: guestId,
      event_id: s.event_id,
      rsvp_status: s.attending ? "confirmed" : "declined",
    }));
  if (rows.length) {
    const { error } = await admin
      .from("guest_events")
      .upsert(rows, { onConflict: "guest_id,event_id" });
    if (error) return { ok: false, error: error.message };
  }

  // Best-effort emails: confirmation to the guest + an alert to the couple.
  // Never block the submission if email fails or isn't configured.
  if (emailConfigured()) {
    try {
      const confirmedIds = (input.selections || []).filter((s) => s.attending).map((s) => s.event_id);
      let names = [];
      if (confirmedIds.length) {
        const { data } = await admin.from("events").select("name_en").in("id", confirmedIds);
        names = (data || []).map((e) => e.name_en);
      }
      const list = names.length
        ? `<p>You're confirmed for:</p><ul>${names.map((n) => `<li>${n}</li>`).join("")}</ul>`
        : `<p>We've noted you can't make it — thank you for letting us know.</p>`;

      if (email) {
        await sendEmail({
          to: email,
          subject: "Thanks for your RSVP",
          html: emailShell("Your RSVP is in 💛", `<p>Hi ${fields.full_name},</p>${list}<p>We can't wait to celebrate with you.</p>`),
        });
      }
      const notify = notifyRecipients();
      if (notify.length) {
        await sendEmail({
          to: notify,
          subject: `New RSVP: ${fields.full_name}`,
          html: emailShell(
            "New RSVP received",
            `<p><b>${fields.full_name}</b> just responded.</p>${list}${(fields.dietary || []).length ? `<p>Dietary: ${fields.dietary.join(", ")}</p>` : ""}`
          ),
        });
      }
    } catch {
      /* ignore email errors */
    }
  }

  return { ok: true, preview: false };
}
