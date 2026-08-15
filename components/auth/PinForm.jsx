"use client";

import { useActionState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { LOCALES } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import { verifyPinAction, setupPinAction } from "@/app/login/actions";

// PIN entry / setup screen. `mode` is "setup" on first run (no PIN yet) or
// "verify" once a PIN exists. `canPersist` is false in preview with no backend.
export default function PinForm({ mode = "verify", canPersist = true }) {
  const { t, locale, setLocale } = useApp();
  const isSetup = mode === "setup";
  const action = isSetup ? setupPinAction : verifyPinAction;
  const [state, formAction, pending] = useActionState(action, null);

  const errorText = state?.error
    ? t(`login.err.${state.error}`) || t("login.err.invalid")
    : "";

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Flat matcha backdrop */}
      <div className="absolute inset-0 -z-10 bg-matcha-100" />

      {/* Language switcher */}
      <div className="absolute right-4 top-4 flex gap-1 rounded-full bg-white/60 p-1 backdrop-blur">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              locale === l.code ? "bg-white text-stone-900" : "text-stone-700 hover:bg-white/70"
            }`}
          >
            {l.short}
          </button>
        ))}
      </div>

      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center text-stone-900">
            <Image
              src="/couple.jpg"
              alt=""
              width={256}
              height={256}
              priority
              className="mx-auto mb-3 h-28 w-28 rounded-full border border-matcha-300 object-cover"
            />
            <h1 className="font-serif text-3xl font-semibold">{t("app.name")}</h1>
            <p className="mt-1 text-sm text-stone-700">{t("app.tagline")}</p>
            <p className="mt-3 text-xs text-stone-700">🇻🇳 Hải Phòng · 🇲🇾 Kota Kinabalu · Oct 2027</p>
          </div>

          <div className="card p-6 animate-fade-in">
            <form action={formAction}>
              <h2 className="text-lg font-semibold text-stone-900">
                {isSetup ? t("login.setupTitle") : t("login.title")}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {isSetup ? t("login.setupSubtitle") : t("login.subtitle")}
              </p>

              <div className="mt-5">
                <label className="label" htmlFor="pin">
                  {isSetup ? t("login.newPinLabel") : t("login.pinLabel")}
                </label>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  pattern="\d{4,8}"
                  maxLength={8}
                  required
                  autoFocus
                  placeholder="••••"
                  className="input tracking-[0.5em] text-center text-lg"
                />
              </div>

              {isSetup && (
                <div className="mt-4">
                  <label className="label" htmlFor="confirm">
                    {t("login.confirmPinLabel")}
                  </label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="\d{4,8}"
                    maxLength={8}
                    required
                    placeholder="••••"
                    className="input tracking-[0.5em] text-center text-lg"
                  />
                </div>
              )}

              {isSetup && !canPersist && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t("login.err.no-backend")}
                </p>
              )}
              {errorText && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorText}</p>
              )}

              <Button type="submit" variant="gold" size="lg" className="mt-5 w-full" disabled={pending}>
                {pending
                  ? t("login.working")
                  : isSetup
                    ? t("login.setPin")
                    : t("login.unlock")}
              </Button>

              <p className="mt-4 text-center text-xs text-stone-400">{t("login.pinHint")}</p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
