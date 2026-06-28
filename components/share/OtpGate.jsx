"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import { requestShareOtp, verifyShareOtp } from "@/lib/otp-actions";

export default function OtpGate({ token, locale = "en" }) {
  const t = makeT(locale);
  const router = useRouter();
  const [stage, setStage] = useState("email"); // email | code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function sendCode() {
    if (!email.trim()) {
      setErr(t("otp.emailRequired"));
      return;
    }
    setErr("");
    setBusy(true);
    const res = await requestShareOtp(token, email);
    setBusy(false);
    if (res.ok) setStage("code");
    else setErr(t("otp.error"));
  }

  async function verify() {
    setErr("");
    setBusy(true);
    const res = await verifyShareOtp(token, email, code);
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(t("otp.invalid"));
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7fb] px-6">
      <div className="card w-full max-w-sm px-6 py-8">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-2xl">🔐</div>
        <h1 className="text-center font-serif text-xl font-semibold text-ink-900">{t("otp.title")}</h1>
        <p className="mt-1 text-center text-sm text-ink-500">{t("otp.intro")}</p>

        <div className="mt-5 space-y-3">
          {stage === "email" ? (
            <>
              <div>
                <label className="label">{t("otp.email")}</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
              <Button variant="gold" onClick={sendCode} disabled={busy} className="w-full">
                {t("otp.sendCode")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-ink-500">{t("otp.sent")}</p>
              <div>
                <label className="label">{t("otp.code")}</label>
                <input
                  className="input text-center text-lg tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                  autoFocus
                />
              </div>
              <Button variant="gold" onClick={verify} disabled={busy} className="w-full">
                {t("otp.verify")}
              </Button>
              <button onClick={() => setStage("email")} className="w-full text-center text-xs text-ink-400 hover:text-ink-600">
                {t("otp.resend")}
              </button>
            </>
          )}
          {err && <p className="text-center text-sm text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}
