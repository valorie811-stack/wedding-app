"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MODULES, SECTIONS } from "@/lib/modules";
import { useApp } from "@/context/AppContext";
import { cx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const { t } = useApp();

  const visible = MODULES;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cx(
          "fixed inset-0 z-30 bg-stone-900/30 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white",
          "transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand — the couple photo, filling the tile rather than sitting
            inside it, since a 36px frame is already tight for two faces.
            Reuses /couple.jpg from the login screen instead of adding another
            asset. The drawn `mark` icon is still in the generated set if this
            ever wants to go back to the 喜. */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/couple.jpg"
              alt=""
              width={72}
              height={72}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="leading-tight">
            <p className="font-mono text-sm font-medium tracking-chrome text-stone-900">
              {t("app.name")}
            </p>
            <p className="font-mono text-[10px] tracking-chrome text-stone-400">
              HP · KK · 2027
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {SECTIONS.map((section) => {
            const items = visible.filter((m) => m.section === section.key);
            if (!items.length) return null;
            return (
              <div key={section.key} className="mb-4">
                <p className="px-2 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-chrome text-stone-400">
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
                            "group flex items-center gap-2.5 rounded-lg px-2.5 py-2",
                            "font-mono text-[13px] tracking-chrome transition",
                            active
                              ? "bg-matcha-100 text-matcha-700"
                              : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                          )}
                        >
                          <Icon
                            name={m.key}
                            size={18}
                            className={cx(
                              "shrink-0 transition-colors",
                              active ? "text-matcha-600" : "text-stone-400 group-hover:text-stone-600"
                            )}
                          />
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
