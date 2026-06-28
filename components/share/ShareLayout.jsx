import { WEDDING_LIST } from "@/lib/theme";

// Branded public wrapper. No app shell / nav / auth. Server component.
export default function ShareLayout({ t, title, subtitle, badgeText, badgeIcon = "🔒", children }) {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div>
            <p className="font-serif text-xl font-semibold text-ink-900">{t("app.name")}</p>
            <p className="text-xs text-ink-500">{t("app.tagline")}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-700">
            {badgeIcon} {badgeText || t("sharePage.badge")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-ink-900">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
          </div>
          <div className="flex gap-1">
            {WEDDING_LIST.map((w) => (
              <span key={w.code} className="text-lg" title={w.city.en}>
                {w.flag}
              </span>
            ))}
          </div>
        </div>

        {children}

        <p className="mt-8 text-center text-xs text-ink-400">
          {t("sharePage.snapshot")} · {t("sharePage.poweredBy", { app: t("app.name") })}
        </p>
      </main>
    </div>
  );
}
