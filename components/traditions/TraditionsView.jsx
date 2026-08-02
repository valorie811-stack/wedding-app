"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { TRADITIONS } from "@/lib/traditions";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";

export default function TraditionsView() {
  const { t, scope, locale } = useApp();

  const visible = useMemo(
    () => TRADITIONS.filter((x) => scope === "BOTH" || x.code === scope || x.code == null),
    [scope, locale] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-medium tracking-chrome text-stone-900">
          {t("traditions.title")}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("traditions.subtitle")}</p>
      </div>

      <div className="space-y-4">
        {visible.map((item) => (
          <Card key={item.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-matcha-100 text-matcha-600">
                  <Icon name={item.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-lg font-medium tracking-chrome text-stone-900">
                      {item.title[locale] || item.title.en}
                    </h2>
                    {item.code ? (
                      <Badge tone={item.code === "HP" ? "hp" : "kk"}>{item.code}</Badge>
                    ) : (
                      <Badge tone="gold">{t("traditions.shared")}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {item.summary[locale] || item.summary.en}
                  </p>
                </div>
              </div>

              {item.customs?.length > 0 && (
                <div className="rounded-lg bg-stone-100 p-4">
                  <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-chrome text-stone-500">
                    {t("traditions.customs")}
                  </p>
                  <ul className="space-y-2">
                    {item.customs.map((c, i) => (
                      <li key={i} className="flex gap-2 text-sm text-stone-700">
                        <span className="mt-1 text-gold-500">◆</span>
                        <span>{c[locale] || c.en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
