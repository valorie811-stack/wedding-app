import { cookies } from "next/headers";
import { makeT, isLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { resolveShare, getShareData } from "@/lib/share-data";
import { isAdminConfigured } from "@/lib/supabase/admin";
import ShareLayout from "@/components/share/ShareLayout";
import ShareGuestList from "@/components/share/ShareGuestList";
import ShareVendorList from "@/components/share/ShareVendorList";
import ShareSchedule from "@/components/share/ShareSchedule";
import OtpGate from "@/components/share/OtpGate";

export const dynamic = "force-dynamic";

const TITLE_KEY = {
  guests: "guests.title",
  vendors: "vendors.title",
  schedule: "calendar.title",
  budget: "budget.title",
};

function StatusPage({ t, title, body }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7fb] px-6">
      <div className="card max-w-sm px-6 py-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-2xl">
          🔗
        </div>
        <h1 className="font-serif text-xl font-semibold text-ink-900">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{body}</p>
        <p className="mt-6 text-xs text-ink-400">{t("app.name")}</p>
      </div>
    </div>
  );
}

export default async function SharePage({ params, searchParams }) {
  const { token } = await params;
  const sp = (await searchParams) || {};
  const locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const t = makeT(locale);

  const res = await resolveShare(token);

  if (res.status !== "ok") {
    const key =
      res.status === "expired" ? "expired" : res.status === "revoked" ? "revoked" : "invalid";
    return (
      <StatusPage t={t} title={t(`sharePage.${key}Title`)} body={t(`sharePage.${key}Body`)} />
    );
  }

  // Email-OTP gate (only enforced when the service role is configured; preview
  // mode can't send codes, so the gate is skipped there).
  if (res.otp_required && isAdminConfigured) {
    const jar = await cookies();
    if (!jar.get(`share_otp_${token}`)?.value) {
      return <OtpGate token={token} locale={locale} />;
    }
  }

  const data = await getShareData(res.resource, res.scope);
  const title = res.label || t(TITLE_KEY[res.resource] || "app.name");

  let view = null;
  if (res.resource === "guests") view = <ShareGuestList data={data} t={t} locale={locale} />;
  else if (res.resource === "vendors") view = <ShareVendorList data={data} t={t} locale={locale} />;
  else if (res.resource === "schedule") view = <ShareSchedule data={data} t={t} locale={locale} />;
  else
    return (
      <StatusPage t={t} title={t("sharePage.invalidTitle")} body={t("sharePage.invalidBody")} />
    );

  return (
    <ShareLayout t={t} title={title}>
      {view}
    </ShareLayout>
  );
}
