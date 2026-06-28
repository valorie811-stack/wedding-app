"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES, SECTIONS } from "@/lib/modules";
import { canAccess } from "@/lib/auth/roles";
import { useApp } from "@/context/AppContext";
import { cx } from "@/lib/cx";

export default function Sidebar({ role = "owner", open = false, onClose }) {
  const pathname = usePathname();
  const { t } = useApp();

  const visible = MODULES.filter((m) => canAccess(role, m.key));

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cx(
          "fixed inset-0 z-30 bg-ink-900/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-100 bg-white",
          "transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-hp-600 to-kk-600 text-base">
            💍
          </span>
          <div className="leading-tight">
            <p className="font-serif text-base font-semibold text-ink-900">{t("app.name")}</p>
            <p className="text-[10px] text-ink-400">🇻🇳 HP · 🇲🇾 KK · 2027</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {SECTIONS.map((section) => {
            const items = visible.filter((m) => m.section === section.key);
            if (!items.length) return null;
            return (
              <div key={section.key} className="mb-4">
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                  {t(section.i18n)}
                </p>
                <ul className="space-y-0.5">
                  {items.map((m) => {
                    const active = pathname === m.route || pathname.startsWith(m.route + "/");
                    return (
                      <li key={m.key}>
                        <Link
                          href={m.route}
                          onClick={onClose}
                          className={cx(
                            "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition",
                            active
                              ? "bg-ink-900 text-white"
                              : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                          )}
                        >
                          <span className="text-base">{m.icon}</span>
                          <span className="flex-1 truncate">{t(`nav.${m.key}`)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
