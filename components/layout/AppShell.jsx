"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { moduleByRoute } from "@/lib/modules";
import { canAccess } from "@/lib/auth/roles";
import { useApp } from "@/context/AppContext";

export default function AppShell({ member, children }) {
  const [open, setOpen] = useState(false);
  const role = member?.role || "owner";
  const pathname = usePathname();
  const { t } = useApp();

  // Guard direct URL access: the sidebar already hides modules a role can't
  // open, but a typed URL would bypass that. Deny here too.
  const mod = moduleByRoute(pathname || "");
  const denied = mod && !canAccess(role, mod.key);

  return (
    <div className="min-h-screen">
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar member={member} onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6">
          {denied ? (
            <div className="grid place-items-center py-20 text-center">
              <div className="card max-w-sm px-6 py-10">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-2xl">
                  🔒
                </div>
                <h2 className="font-serif text-lg font-semibold text-ink-900">
                  {t("settings.accessDeniedTitle")}
                </h2>
                <p className="mt-1 text-sm text-ink-500">{t("settings.accessDeniedBody")}</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
