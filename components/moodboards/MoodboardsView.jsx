"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WEDDINGS, WEDDING_LIST } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveMoodItem, deleteMoodItem } from "@/app/(app)/moodboards/actions";
import useOptimisticWrite, { newTempId } from "@/components/hooks/useOptimisticWrite";
import ErrorBanner from "@/components/ui/ErrorBanner";
import tokens from "@/lib/tokens";
import Icon from "@/components/ui/Icon";

const PRESETS = [
  tokens.hp[600],
  tokens.hp[800],
  tokens.gold[500],
  tokens.gold[700],
  tokens.kk[600],
  tokens.kk[400],
  tokens.hp[100],
  tokens.kk[100],
  tokens.matcha[900],
  tokens.matcha[100],
];
const blank = { id: null, code: "HP", board: "", title: "", image_url: "", swatches: [], notes: "" };

function normalizeHex(v) {
  let s = v.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = "#" + s;
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : null;
}

export default function MoodboardsView({ items: initial, preview }) {
  const { t, scope } = useApp();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState(null);
  const { error, dismissError, run } = useOptimisticWrite();

  const visible = useMemo(
    () => items.filter((i) => scope === "BOTH" || i.code === scope || i.code == null),
    [items, scope]
  );

  const boards = useMemo(() => {
    const map = new Map();
    visible.forEach((i) => {
      const key = i.board || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    });
    return [...map.entries()];
  }, [visible]);

  function openNew() {
    setForm({ ...blank, code: scope === "KK" ? "KK" : "HP" });
  }
  function openEdit(m) {
    setForm({
      id: m.id,
      code: m.code ?? "",
      board: m.board || "",
      title: m.title || "",
      image_url: m.image_url || "",
      swatches: [...(m.swatches || [])],
      notes: m.notes || "",
    });
  }
  function handleSave() {
    const payload = {
      id: form.id,
      code: form.code || null,
      board: form.board.trim() || "General",
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      swatches: form.swatches,
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
      action: () => saveMoodItem(payload),
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
  function handleDelete(m) {
    if (!window.confirm(t("moodboards.deleteConfirm"))) return;
    const index = items.findIndex((i) => i.id === m.id);
    run({
      apply: () => setItems((prev) => prev.filter((i) => i.id !== m.id)),
      action: () => deleteMoodItem(m.id),
      revert: () =>
        setItems((prev) => {
          const next = [...prev];
          next.splice(index < 0 ? next.length : index, 0, m);
          return next;
        }),
      message: t("common.deleteFailed"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("moodboards.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("moodboards.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {preview && <Badge tone="amber"><Icon name="warning" size={12} />{t("common.preview")}</Badge>}
          <Button variant="gold" onClick={openNew}>+ {t("moodboards.addItem")}</Button>
        </div>
      </div>

      <ErrorBanner
        error={error}
        onDismiss={dismissError}
        dismissLabel={t("common.close")}
        detailsLabel={t("common.errorDetails")}
      />

      {visible.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-10 text-center text-sm text-stone-400">{t("moodboards.noItems")}</p>
          </CardBody>
        </Card>
      ) : (
        boards.map(([board, list]) => (
          <section key={board} className="space-y-3">
            <h2 className="font-serif text-lg font-semibold text-stone-800">{board}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => (
                <Card key={m.id} className="group overflow-hidden">
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image_url}
                      alt={m.title || ""}
                      className="h-40 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="grid h-40 w-full place-items-center bg-stone-100 text-3xl">🎨</div>
                  )}
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-stone-900">{m.title || "—"}</h3>
                      {m.code ? (
                        <Badge tone={m.code === "HP" ? "hp" : "kk"}>{m.code}</Badge>
                      ) : (
                        <Badge tone="gold">↔</Badge>
                      )}
                    </div>
                    {m.swatches?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.swatches.map((c, i) => (
                          <span
                            key={i}
                            title={c}
                            className="h-5 w-5 rounded-full border border-stone-200"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    )}
                    {m.notes && <p className="text-xs text-stone-500">{m.notes}</p>}
                    <div className="flex justify-end gap-1 pt-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <button onClick={() => openEdit(m)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700"><Icon name="edit" size={13} /> {t("common.edit")}</button>
                      <button onClick={() => handleDelete(m)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-red-50 hover:text-red-600"><Icon name="trash" size={13} /> {t("common.delete")}</button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <MoodForm form={form} setForm={setForm} onSave={handleSave} onClose={() => setForm(null)} t={t} />
    </div>
  );
}

function MoodForm({ form, setForm, onSave, onClose, t }) {
  const [hexInput, setHexInput] = useState("");
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleSwatch(c) {
    setForm((f) => ({
      ...f,
      swatches: f.swatches.includes(c) ? f.swatches.filter((x) => x !== c) : [...f.swatches, c],
    }));
  }
  function addHex() {
    const h = normalizeHex(hexInput);
    if (h && !form.swatches.includes(h)) setForm((f) => ({ ...f, swatches: [...f.swatches, h] }));
    setHexInput("");
  }

  return (
    <Modal
      open={!!form}
      onClose={onClose}
      size="lg"
      title={form.id ? t("moodboards.editItem") : t("moodboards.newItem")}
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
              <option value="">↔ {t("moodboards.shared")}</option>
              {WEDDING_LIST.map((w) => (
                <option key={w.code} value={w.code}>{w.flag} {w.city.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("moodboards.board")}</label>
            <input className="input" value={form.board} onChange={set("board")} placeholder={t("moodboards.boardPlaceholder")} />
          </div>
        </div>
        <div>
          <label className="label">{t("moodboards.titleLabel")}</label>
          <input className="input" value={form.title} onChange={set("title")} autoFocus />
        </div>
        <div>
          <label className="label">{t("moodboards.imageUrl")}</label>
          <input className="input" value={form.image_url} onChange={set("image_url")} placeholder={t("moodboards.imageUrlPlaceholder")} />
        </div>
        <div>
          <label className="label">{t("moodboards.swatches")}</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESETS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleSwatch(c)}
                title={c}
                className={`h-7 w-7 rounded-full border-2 ${form.swatches.includes(c) ? "border-stone-700" : "border-stone-200"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHex();
                }
              }}
              placeholder={t("moodboards.addSwatch")}
            />
            <Button type="button" variant="outline" onClick={addHex}>+</Button>
          </div>
          {form.swatches.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.swatches.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pl-1 pr-2 text-xs">
                  <span className="h-4 w-4 rounded-full border border-stone-200" style={{ background: c }} />
                  <button type="button" onClick={() => toggleSwatch(c)} className="text-stone-400 hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="label">{t("moodboards.notes")}</label>
          <textarea className="input min-h-[3.5rem]" value={form.notes} onChange={set("notes")} />
        </div>
      </form>
    </Modal>
  );
}
