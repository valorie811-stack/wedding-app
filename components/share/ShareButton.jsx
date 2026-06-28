"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { buildShareUrl, EXPIRY_CHOICES } from "@/lib/share";
import { createShare, listShares, revokeShare } from "@/lib/share-actions";
import QrCode from "@/components/share/QrCode";

const SCOPES = ["BOTH", "HP", "KK"];
const lsKey = (resource) => `tw.shares.${resource}`;

function readLocal(resource) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(resource)) || "[]");
  } catch {
    return [];
  }
}
function writeLocal(resource, arr) {
  try {
    localStorage.setItem(lsKey(resource), JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export default function ShareButton({ resource, label, basePath = "/share", noteKey = "share.readOnlyNote" }) {
  const { t, scope: appScope, locale } = useApp();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(appScope || "BOTH");
  const [expiryKey, setExpiryKey] = useState("30");
  const [otp, setOtp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { token, url }
  const [copied, setCopied] = useState(null);
  const [links, setLinks] = useState([]);
  const [preview, setPreview] = useState(false);

  async function openModal() {
    setOpen(true);
    setCreated(null);
    const res = await listShares(resource);
    if (res.preview) {
      setPreview(true);
      setLinks(readLocal(resource));
    } else {
      setPreview(false);
      setLinks(res.shares || []);
    }
  }

  function fmtExpiry(iso) {
    if (!iso) return t("share.noExpiry");
    try {
      const d = new Intl.DateTimeFormat(
        locale === "zh" ? "zh-CN" : locale === "vi" ? "vi-VN" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" }
      ).format(new Date(iso));
      return t("share.expiresOn", { date: d });
    } catch {
      return iso;
    }
  }

  async function handleCreate() {
    setBusy(true);
    const choice = EXPIRY_CHOICES.find((c) => c.key === expiryKey);
    const expMs = choice?.days ? Date.now() + choice.days * 86400000 : null;
    const res = await createShare({ resource, scope, expMs, label, otp });
    setBusy(false);
    if (!res.ok || !res.token) return;
    const url = buildShareUrl(res.token, basePath);
    const entry = {
      id: res.id ?? res.token,
      token: res.token,
      scope,
      label,
      expires_at: expMs ? new Date(expMs).toISOString() : null,
      created_at: new Date().toISOString(),
    };
    setCreated({ token: res.token, url });
    setLinks((prev) => {
      const next = [entry, ...prev];
      if (res.preview) writeLocal(resource, next);
      return next;
    });
  }

  async function handleRevoke(entry) {
    setLinks((prev) => {
      const next = prev.filter((l) => (l.id || l.token) !== (entry.id || entry.token));
      if (preview) writeLocal(resource, next);
      return next;
    });
    if (created?.token === entry.token) setCreated(null);
    if (!preview) await revokeShare(entry.id).catch(() => {});
  }

  function copy(url, token) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    });
  }
  function whatsapp(url) {
    const text = t("share.shareText", { what: label });
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
  }
  function webshare(url) {
    const text = t("share.shareText", { what: label });
    if (navigator.share) navigator.share({ title: label, text, url }).catch(() => {});
    else copy(url, "webshare");
  }

  return (
    <>
      <Button variant="outline" onClick={openModal}>
        🔗 {t("share.title")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${t("share.title")} — ${label}`}
        footer={
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-500">{t(noteKey)}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("scope.viewing")}</label>
              <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s === "BOTH" ? t("scope.both") : t(`scope.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("share.expiry")}</label>
              <select className="input" value={expiryKey} onChange={(e) => setExpiryKey(e.target.value)}>
                {EXPIRY_CHOICES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.days ? t("share.days", { n: c.days }) : t("share.never")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(resource === "guests" || resource === "rsvp") && (
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300 text-kk-600"
                checked={otp}
                onChange={(e) => setOtp(e.target.checked)}
              />
              {t("share.requireOtp")}
            </label>
          )}

          <Button variant="gold" onClick={handleCreate} disabled={busy} className="w-full">
            {t("share.createLink")}
          </Button>

          {/* Just-created link with quick actions */}
          {created && (
            <div className="rounded-xl border border-gold-200 bg-gold-50 p-3">
              <input
                readOnly
                value={created.url}
                onFocus={(e) => e.target.select()}
                className="w-full truncate rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-700"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => copy(created.url, created.token)}>
                  {copied === created.token ? t("share.copied") : t("share.copy")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => whatsapp(created.url)}>
                  🟢 {t("share.whatsapp")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => webshare(created.url)}>
                  {t("share.webshare")}
                </Button>
              </div>
              <div className="mt-3 flex justify-center">
                <QrCode value={created.url} label={`${resource}-qr`} />
              </div>
            </div>
          )}

          {/* Active links */}
          <div>
            <p className="label">{t("share.activeLinks")}</p>
            {links.length === 0 ? (
              <p className="py-3 text-center text-xs text-ink-400">{t("share.noLinks")}</p>
            ) : (
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
                {links.map((l) => {
                  const url = buildShareUrl(l.token, basePath);
                  return (
                    <li key={l.id || l.token} className="flex items-center gap-2 px-3 py-2">
                      <Badge tone={l.scope === "HP" ? "hp" : l.scope === "KK" ? "kk" : "neutral"}>
                        {l.scope}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-xs text-ink-500">{fmtExpiry(l.expires_at)}</span>
                      <button
                        onClick={() => copy(url, l.token)}
                        className="rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-ink-100"
                      >
                        {copied === l.token ? t("share.copied") : t("share.copy")}
                      </button>
                      <button
                        onClick={() => handleRevoke(l)}
                        className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t("share.revoke")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {preview && <p className="text-xs italic text-ink-400">{t("share.previewNote")}</p>}
        </div>
      </Modal>
    </>
  );
}
