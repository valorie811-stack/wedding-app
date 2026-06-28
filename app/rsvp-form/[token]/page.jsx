import { makeT, isLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { resolveShare, getShareData } from "@/lib/share-data";
import ShareLayout from "@/components/share/ShareLayout";
import PublicRsvpForm from "@/components/rsvp/PublicRsvpForm";

export const dynamic = "force-dynamic";

function StatusPage({ t, title, body }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7fb] px-6">
      <div className="card max-w-sm px-6 py-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-2xl">
          💌
        </div>
        <h1 className="font-serif text-xl font-semibold text-ink-900">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{body}</p>
        <p className="mt-6 text-xs text-ink-400">{t("app.name")}</p>
      </div>
    </div>
  );
}

export default async function RsvpFormPage({ params, searchParams }) {
  const { token } = await params;
  const sp = (await searchParams) || {};
  const locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const t = makeT(locale);

  const res = await resolveShare(token);
  if (res.status !== "ok" || res.resource !== "rsvp") {
    const key =
      res.status === "expired" ? "expired" : res.status === "revoked" ? "revoked" : "invalid";
    return <StatusPage t={t} title={t(`sharePage.${key}Title`)} body={t(`sharePage.${key}Body`)} />;
  }

  const data = await getShareData("rsvp", res.scope);

  return (
    <ShareLayout t={t} title={t("rsvpForm.title")} badgeText={t("rsvpForm.badge")} badgeIcon="💌">
      <PublicRsvpForm token={token} events={data.events || []} locale={locale} />
    </ShareLayout>
  );
}
