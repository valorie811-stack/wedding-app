"use client";

import { useApp } from "@/context/AppContext";
import { MODULES } from "@/lib/modules";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";

export default function Placeholder({ moduleKey }) {
  const { t } = useApp();
  const mod = MODULES.find((m) => m.key === moduleKey);
  const phase = mod?.phase || 2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-medium tracking-chrome text-stone-900">
          {t(`nav.${moduleKey}`)}
        </h1>
      </div>

      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-xl bg-matcha-100 text-matcha-600">
          <Icon name={moduleKey} size={30} />
        </div>
        <Badge tone="gold">
          {t("common.plannedFor")} {t("common.phase")} {phase}
        </Badge>
        <h2 className="mt-4 font-mono text-lg font-medium tracking-chrome text-stone-900">
          {t(`nav.${moduleKey}`)}
        </h2>
        <p className="mt-1 max-w-sm text-sm text-stone-500">{t("common.comingSoon")}</p>
      </div>
    </div>
  );
}
