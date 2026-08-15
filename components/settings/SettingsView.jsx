"use client";

import { useActionState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { changePinAction } from "@/app/(app)/settings/actions";
import { signOutAction } from "@/app/login/actions";

// Single-owner security settings: change the shared PIN and sign out.
export default function SettingsView({ canPersist = true }) {
  const { t } = useApp();
  const [state, formAction, pending] = useActionState(changePinAction, null);

  const errorText = state?.error
    ? t(`login.err.${state.error}`) || t("login.err.invalid")
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("settings.title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("settings.subtitle")}</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <h2 className="text-sm font-semibold text-stone-900">{t("settings.changePinTitle")}</h2>
          <p className="mt-0.5 text-xs text-stone-500">{t("settings.changePinSubtitle")}</p>
        </CardHeader>
        <CardBody>
          {!canPersist ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("login.err.no-backend")}
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <label className="label" htmlFor="current">
                  {t("settings.currentPin")}
                </label>
                <input
                  id="current"
                  name="current"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,8}"
                  maxLength={8}
                  required
                  autoComplete="current-password"
                  className="input tracking-[0.4em]"
                />
              </div>
              <div>
                <label className="label" htmlFor="next">
                  {t("settings.newPin")}
                </label>
                <input
                  id="next"
                  name="next"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,8}"
                  maxLength={8}
                  required
                  autoComplete="new-password"
                  className="input tracking-[0.4em]"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirm">
                  {t("settings.confirmPin")}
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,8}"
                  maxLength={8}
                  required
                  autoComplete="new-password"
                  className="input tracking-[0.4em]"
                />
              </div>

              {state?.ok && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {t("settings.pinUpdated")}
                </p>
              )}
              {errorText && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorText}</p>
              )}

              <Button type="submit" variant="gold" disabled={pending}>
                {pending ? t("login.working") : t("settings.changePinTitle")}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <h2 className="text-sm font-semibold text-stone-900">{t("settings.sessionTitle")}</h2>
        </CardHeader>
        <CardBody>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              {t("common.signOut")}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
