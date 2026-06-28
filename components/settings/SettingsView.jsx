"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { ROLES, ROLE_MODULES } from "@/lib/auth/roles";
import { MODULES } from "@/lib/modules";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { updateMemberRole, removeMember, createInvite, revokeInvite } from "@/app/(app)/settings/actions";

const ROLE_TONE = { owner: "gold", planner: "kk", family: "hp", party: "neutral", guest: "neutral", vendor: "neutral" };

export default function SettingsView({ members: initialMembers, invites: initialInvites, currentRole, preview }) {
  const { t } = useApp();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "guest" });
  const isOwner = currentRole === "owner";

  function changeRole(m, role) {
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, role } : x)));
    updateMemberRole(m.id, role).catch(() => {});
  }
  function handleRemoveMember(m) {
    if (!window.confirm(t("settings.removeMemberConfirm"))) return;
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
    removeMember(m.id).catch(() => {});
  }
  function handleInvite() {
    const email = inviteForm.email.trim();
    if (!email) return;
    const optimistic = { id: crypto.randomUUID(), email, role: inviteForm.role, created_at: new Date().toISOString() };
    setInvites((prev) => [...prev, optimistic]);
    setInviteForm({ email: "", role: "guest" });
    createInvite({ email, role: optimistic.role }).catch(() => {});
  }
  function handleRevoke(inv) {
    if (!window.confirm(t("settings.revokeInviteConfirm"))) return;
    setInvites((prev) => prev.filter((x) => x.id !== inv.id));
    revokeInvite(inv.id).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{t("settings.title")}</h1>
          <p className="mt-0.5 text-sm text-ink-500">{t("settings.subtitle")}</p>
        </div>
        {preview && <Badge tone="amber">⚠️ {t("common.preview")}</Badge>}
      </div>

      {!isOwner && (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">{t("settings.ownerOnly")}</p>
          </CardBody>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader title={t("settings.members")} subtitle={`${members.length}`} />
        <CardBody className="pt-0">
          <ul className="divide-y divide-ink-100">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hp-600 to-kk-600 text-xs font-semibold text-white">
                  {(m.full_name || "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{m.full_name}</span>
                {isOwner ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value)}
                      className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{t(`roles.${r}`)}</option>
                      ))}
                    </select>
                    {m.role !== "owner" && (
                      <button onClick={() => handleRemoveMember(m)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        {t("settings.remove")}
                      </button>
                    )}
                  </>
                ) : (
                  <Badge tone={ROLE_TONE[m.role] || "neutral"}>{t(`roles.${m.role}`)}</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Invites */}
      {isOwner && (
        <Card>
          <CardHeader title={t("settings.invites")} />
          <CardBody className="space-y-4 pt-0">
            {invites.length === 0 ? (
              <p className="py-2 text-sm text-ink-400">{t("settings.noInvites")}</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{inv.email}</span>
                    <Badge tone={ROLE_TONE[inv.role] || "neutral"}>{t(`roles.${inv.role}`)}</Badge>
                    <button onClick={() => handleRevoke(inv)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                      {t("settings.revoke")}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-end gap-2 border-t border-ink-100 pt-4">
              <div className="min-w-[12rem] flex-1">
                <label className="label">{t("settings.email")}</label>
                <input
                  className="input"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="label">{t("settings.role")}</label>
                <select
                  className="input"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>{t(`roles.${r}`)}</option>
                  ))}
                </select>
              </div>
              <Button variant="gold" onClick={handleInvite}>{t("settings.send")}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Role access reference */}
      <Card>
        <CardHeader title={t("settings.access")} />
        <CardBody className="pt-0">
          <ul className="divide-y divide-ink-100">
            {ROLES.map((r) => {
              const mods = ROLE_MODULES[r] || [];
              const label = mods.includes("*")
                ? t("settings.everything")
                : MODULES.filter((m) => mods.includes(m.key)).map((m) => t(`nav.${m.key}`)).join(", ");
              return (
                <li key={r} className="flex flex-wrap items-baseline gap-2 py-2.5 text-sm">
                  <Badge tone={ROLE_TONE[r] || "neutral"}>{t(`roles.${r}`)}</Badge>
                  <span className="text-ink-500">{label}</span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
