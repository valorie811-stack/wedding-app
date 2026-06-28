"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { LOCALES } from "@/lib/i18n";
import { WEDDINGS } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/lib/cx";
import Countdown from "@/components/dashboard/Countdown";

function ScopeSwitcher() {
  const { scope, setScope, t } = useApp();
  const options = [
    { key: "BOTH", label: t("scope.both") },
    { key: "HP", label: "🇻🇳 " + t("scope.HP") },
    { key: "KK", label: "🇲🇾 " + t("scope.KK") },
  ];
  return (
    <div className="flex rounded-full bg-ink-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => setScope(o.key)}
          className={cx(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            scope === o.key ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Topbar({ member, onMenu }) {
  const { t, locale, setLocale } = useApp();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur">
      {/* Row 1: controls */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          onClick={onMenu}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden"
          aria-label="Menu"
        >
          ☰
        </button>

        <div className="hidden sm:block">
          <ScopeSwitcher />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Language */}
          <div className="flex rounded-full bg-ink-100 p-0.5">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  locale === l.code ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
                )}
              >
                {l.short}
              </button>
            ))}
          </div>

          {/* Member + sign out */}
          {member && (
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium leading-tight text-ink-900">
                  {member.full_name}
                </p>
                <p className="text-[10px] leading-tight text-ink-400">{t(`roles.${member.role}`)}</p>
              </div>
              <button
                onClick={signOut}
                title={t("common.signOut")}
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-hp-600 to-kk-600 text-xs font-semibold text-white"
              >
                {(member.full_name || "?").slice(0, 1).toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: dual countdowns */}
      <div className="flex items-center gap-4 overflow-x-auto border-t border-ink-100 px-4 py-1.5 text-xs">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-hp-700">
          <span>{WEDDINGS.HP.flag}</span>
          <span className="font-medium">{WEDDINGS.HP.city[locale]}</span>
          <Countdown target={WEDDINGS.HP.date} variant="compact" accent="hp" />
        </span>
        <span className="h-3 w-px bg-ink-200" />
        <span className="flex items-center gap-1.5 whitespace-nowrap text-kk-700">
          <span>{WEDDINGS.KK.flag}</span>
          <span className="font-medium">{WEDDINGS.KK.city[locale]}</span>
          <Countdown target={WEDDINGS.KK.date} variant="compact" accent="kk" />
        </span>
        <div className="ml-auto sm:hidden">
          <ScopeSwitcher />
        </div>
      </div>
    </header>
  );
}
