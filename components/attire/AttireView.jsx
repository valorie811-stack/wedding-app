"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WEDDING_LIST } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveAttireItem, deleteAttireItem } from "@/app/(app)/attire/actions";
import useOptimisticWrite, { newTempId } from "@/components/hooks/useOptimisticWrite";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Icon from "@/components/ui/Icon";

const ROLE_ORDER = ["bride", "groom", "family", "party", "guest", "other"];
const STATUSES = ["inspiration", "confirmed"];
const blank = { id: null, code: "HP", role: "bride", title: "", image_url: "", status: "inspiration", notes: "" };

export default function AttireView({ items: initial, preview }) {
  const { t, scope } = useApp();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState(null);
  const { error, dismissError, run } = useOptimisticWrite();

  const visible = useMemo(
    () => items.filter((i) => scope === "BOTH" || i.code === scope || i.code == null),
    [items, scope]
  );

  const byRole = useMemo(
    () =>
      ROLE_ORDER.map((role) => ({ role, list: visible.filter((i) => i.role === role) })).filter(
        (g) => g.list.length > 0
      ),
    [visible]
  );

  function openNew() {
    setForm({ ...blank, code: scope === "KK" ? "KK" : "HP" });
  }
  function openEdit(a) {
    setForm({
      id: a.id,
      code: a.code ?? "HP",
      role: a.role || "bride",
      title: a.title || "",
      image_url: a.image_url || "",
      status: a.status || "inspiration",
      notes: a.notes || "",
    });
  }
  function handleSave() {
    const payload = {
      id: form.id,
      code: form.code || null,
      role: form.role,
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      status: form.status,
      notes: form.notes.trim(),
    };
    const editingId = form.id;
    const previousRow = editingId ? items.find((i) => i.id === editingId) : null;
    const tempId = newTempId();
    setForm(null);

    run({
      apply: () =>
        setItems((prev) =>
          editingId
            ? prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i))
            : [...prev, { ...payload, id: tempId }]
        ),
      action: () => saveAttireItem(payload),
      revert: () =>
        setItems((prev) =>
          editingId
            ? prev.map((i) => (i.id === editingId && previousRow ? previousRow : i))
            : prev.filter((i) => i.id !== tempId)
        ),
      adopt: (id) => setItems((prev) => prev.map((i) => (i.id === tempId ? { ...i, id } : i))),
      message: t("common.saveFailed"),
    });
  }
  function handleDelete(a) {
    if (!window.confirm(t("attire.deleteConfirm"))) return;
    const index = items.findIndex((i) => i.id === a.id);
    run({
      apply: () => setItems((prev) => prev.filter((i) => i.id !== a.id)),
      action: () => deleteAttireItem(a.id),
      // Restore at its original position so the grid order survives a failure.
      revert: () =>
        setItems((prev) => {
          const next = [...prev];
          next.splice(index < 0 ? next.length : index, 0, a);
          return next;
        }),
      message: t("common.deleteFailed"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("attire.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("attire.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {preview && <Badge tone="amber"><Icon name="warning" size={12} />{t("common.preview")}</Badge>}
          <Button variant="gold" onClick={openNew}>+ {t("attire.addItem")}</Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={dismissError} dismissLabel={t("common.close")} />

      {visible.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-10 text-center text-sm text-stone-400">{t("attire.noItems")}</p>
          </CardBody>
        </Card>
      ) : (
        byRole.map(({ role, list }) => (
          <section key={role} className="space-y-3">
            <h2 className="font-serif text-lg font-semibold text-stone-800">{t(`attire.roles.${role}`)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((a) => (
                <Card key={a.id} className="group overflow-hidden">
                  {a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image_url}
                      alt={a.title || ""}
                      className="h-56 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="grid h-56 w-full place-items-center bg-stone-100 text-3xl">👗</div>
                  )}
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-stone-900">{a.title || "—"}</h3>
                      {a.code && <Badge tone={a.code === "HP" ? "hp" : "kk"}>{a.code}</Badge>}
                    </div>
                    <Badge tone={a.status === "confirmed" ? "green" : "neutral"}>
                      {t(`attire.statuses.${a.status}`)}
                    </Badge>
                    {a.notes && <p className="text-xs text-stone-500">{a.notes}</p>}
                    <div className="flex justify-end gap-1 pt-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <button onClick={() => openEdit(a)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700"><Icon name="edit" size={13} /> {t("common.edit")}</button>
                      <button onClick={() => handleDelete(a)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-red-50 hover:text-red-600"><Icon name="trash" size={13} /> {t("common.delete")}</button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <AttireForm form={form} setForm={setForm} onSave={handleSave} onClose={() => setForm(null)} t={t} />
    </div>
  );
}

function AttireForm({ form, setForm, onSave, onClose, t }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      open={!!form}
      onClose={onClose}
      title={form.id ? t("attire.editItem") : t("attire.newItem")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={onSave}>{t("common.save")}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("common.wedding")}</label>
            <select className="input" value={form.code} onChange={set("code")}>
              {WEDDING_LIST.map((w) => (
                <option key={w.code} value={w.code}>{w.flag} {w.city.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("attire.role")}</label>
            <select className="input" value={form.role} onChange={set("role")}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>{t(`attire.roles.${r}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t("attire.titleLabel")}</label>
          <input className="input" value={form.title} onChange={set("title")} autoFocus />
        </div>
        <div>
          <label className="label">{t("attire.imageUrl")}</label>
          <input className="input" value={form.image_url} onChange={set("image_url")} placeholder={t("attire.imageUrlPlaceholder")} />
        </div>
        <div>
          <label className="label">{t("attire.status")}</label>
          <select className="input" value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`attire.statuses.${s}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("attire.notes")}</label>
          <textarea className="input min-h-[3.5rem]" value={form.notes} onChange={set("notes")} />
        </div>
      </form>
    </Modal>
  );
}
