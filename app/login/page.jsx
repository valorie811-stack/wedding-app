"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { LOCALES } from "@/lib/i18n";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const { t, locale, setLocale } = useApp();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error | unconfigured
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setStatus("unconfigured");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Dual-wedding gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-hp-600 via-ink-900 to-kk-700" />
      <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(60rem_40rem_at_10%_-10%,#fbbf24,transparent),radial-gradient(50rem_40rem_at_110%_110%,#5eead4,transparent)]" />

      {/* Language switcher */}
      <div className="absolute right-4 top-4 flex gap-1 rounded-full bg-white/15 p-1 backdrop-blur">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              locale === l.code ? "bg-white text-ink-900" : "text-white/90 hover:bg-white/10"
            }`}
          >
            {l.short}
          </button>
        ))}
      </div>

      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center text-white">
            <div className="mb-2 text-4xl">💍</div>
            <h1 className="font-serif text-3xl font-semibold">{t("app.name")}</h1>
            <p className="mt-1 text-sm text-white/80">{t("app.tagline")}</p>
            <p className="mt-3 text-xs text-white/70">🇻🇳 Hải Phòng · 🇲🇾 Kota Kinabalu · Oct 2027</p>
          </div>

          <div className="card p-6 animate-fade-in">
            {status === "sent" ? (
              <div className="text-center">
                <div className="mb-3 text-3xl">📬</div>
                <h2 className="text-lg font-semibold text-ink-900">{t("login.checkEmailTitle")}</h2>
                <p className="mt-2 text-sm text-ink-600">
                  {t("login.checkEmailBody")} <span className="font-medium text-ink-900">{email}</span>
                </p>
                <p className="mt-2 text-xs text-ink-500">{t("login.checkEmailHint")}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-sm font-medium text-hp-600 hover:underline"
                >
                  {t("login.backToLogin")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-lg font-semibold text-ink-900">{t("login.title")}</h2>
                <p className="mt-1 text-sm text-ink-600">{t("login.subtitle")}</p>

                <div className="mt-5">
                  <label className="label" htmlFor="email">
                    {t("login.emailLabel")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login.emailPlaceholder")}
                    className="input"
                  />
                </div>

                {status === "unconfigured" && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {t("login.notConfigured")}
                  </p>
                )}
                {status === "error" && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {errorMsg || t("login.error")}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="mt-5 w-full"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? t("login.sending") : t("login.sendLink")}
                </Button>

                <p className="mt-4 text-center text-xs text-ink-400">{t("login.demoNote")}</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
