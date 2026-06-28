"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { inScope } from "@/lib/dashboard";
import { formatMoney, formatAUD, toAUD, pct } from "@/lib/format";
import { WEDDINGS, WEDDING_LIST } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveCategory, deleteCategory, saveItem, deleteItem } from "@/app/(app)/budget/actions";
import ExportButton from "@/components/share/ExportButton";

export default function BudgetView({ categories: initialCats, items: initialItems, preview }) {
  const { t, scope } = useApp();
  const [categories, setCategories] = useState(initialCats);
  const [items, setItems] = useState(initialItems);
  const [catForm, setCatForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);

  const visibleCats = useMemo(() => categories.filter((c) => inScope(c.code, scope)), [categories, scope]);
  const visibleItems = useMemo(() => items.filter((i) => inScope(i.code, scope)), [items, scope]);

  const byWedding = useMemo(
    () =>
      WEDDING_LIST.filter((w) => inScope(w.code, scope)).map((w) => ({
        wedding: w,
        cats: visibleCats.filter((c) => c.code === w.code),
      })),
    [visibleCats, scope]
  );

  const combined = useMemo(() => {
    let planned = 0;
    let actual = 0;
    visibleCats.forEach((c) => (planned += toAUD(c.planned, c.currency)));
    visibleItems.forEach((i) => (actual += toAUD(i.actual, i.currency)));
    return { planned, actual, usedPct: pct(actual, planned) };
  }, [visibleCats, visibleItems]);

  const itemsFor = (code, category) =>
    visibleItems.filter((i) => i.code === code && i.category === category);

  // ---- Category handlers ----
  function openNewCategory() {
    setCatForm({ id: null, code: scope === "KK" ? "KK" : "HP", category: "", planned: "" });
  }
  function openEditCategory(c) {
    setCatForm({ id: c.id, code: c.code, category: c.category, planned: String(c.planned ?? "") });
  }
  function handleSaveCategory() {
    const name = catForm.category.trim();
    if (!name) return;
    const currency = WEDDINGS[catForm.code]?.currency;
    const payload = { id: catForm.id, code: catForm.code, currency, category: name, planned: Number(catForm.planned) || 0 };
    setCategories((prev) => {
      if (catForm.id) return prev.map((c) => (c.id === catForm.id ? { ...c, ...payload } : c));
      return [...prev, { ...payload, id: crypto.randomUUID() }];
    });
    setCatForm(null);
    saveCategory(payload).catch(() => {});
  }
  function handleDeleteCategory(c) {
    if (!window.confirm(t("budget.deleteCategoryConfirm"))) return;
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
    setItems((prev) => prev.filter((i) => !(i.code === c.code && i.category === c.category)));
    deleteCategory({ id: c.id, code: c.code, category: c.category }).catch(() => {});
  }

  // ---- Expense item handlers ----
  function openNewItem(presetKey) {
    const key = presetKey || (visibleCats[0] && `${visibleCats[0].code}|${visibleCats[0].category}`);
    if (!key) return;
    setItemForm({ id: null, categoryKey: key, label: "", actual: "" });
  }
  function openEditItem(it) {
    setItemForm({ id: it.id, categoryKey: `${it.code}|${it.category}`, label: it.label || "", actual: String(it.actual ?? "") });
  }
  function handleSaveItem() {
    const [code, category] = itemForm.categoryKey.split("|");
    const currency = WEDDINGS[code]?.currency;
    const payload = {
      id: itemForm.id,
      code,
      category,
      currency,
      label: itemForm.label.trim(),
      actual: Number(itemForm.actual) || 0,
    };
    setItems((prev) => {
      if (itemForm.id) return prev.map((i) => (i.id === itemForm.id ? { ...i, ...payload } : i));
      return [...prev, { ...payload, id: crypto.randomUUID() }];
    });
    setItemForm(null);
    saveItem(payload).catch(() => {});
  }
  function handleDeleteItem(it) {
    if (!window.confirm(t("budget.deleteConfirm"))) return;
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    deleteItem(it.id).catch(() => {});
  }

  function exportRows() {
    return visibleItems.map((it) => {
      const cat = visibleCats.find((c) => c.code === it.code && c.category === it.category);
      return {
        [t("common.wedding")]: it.code,
        [t("budget.category")]: it.category,
        [t("budget.plannedAmount")]: cat ? Number(cat.planned) : "",
        [t("budget.description")]: it.label || "",
        [t("budget.actual")]: Number(it.actual),
        Currency: it.currency,
      };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{t("budget.title")}</h1>
          <p className="mt-0.5 text-sm text-ink-500">{t("budget.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview && <Badge tone="amber">⚠️ {t("common.preview")}</Badge>}
          <ExportButton getRows={exportRows} filename="budget" sheetName={t("budget.title")} />
          <Button variant="outline" onClick={openNewCategory}>
            + {t("budget.addCategory")}
          </Button>
          <Button variant="gold" onClick={() => openNewItem()} disabled={visibleCats.length === 0}>
            + {t("budget.addExpense")}
          </Button>
        </div>
      </div>

      {/* Combined AUD rollup */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label={t("budget.combinedAUD")} value={formatAUD(combined.planned)} tone="ink" />
            <Stat label={t("budget.spent")} value={formatAUD(combined.actual)} tone="kk" />
            <Stat label={t("budget.remaining")} value={formatAUD(Math.max(0, combined.planned - combined.actual))} tone="gold" />
            <Stat label={t("budget.used")} value={`${combined.usedPct}%`} tone="hp" />
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${combined.usedPct > 100 ? "bg-red-500" : "bg-kk-500"}`}
              style={{ width: `${Math.min(100, combined.usedPct)}%` }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Per-wedding categories */}
      {byWedding.map(({ wedding, cats }) => (
        <WeddingBudget
          key={wedding.code}
          wedding={wedding}
          cats={cats}
          itemsFor={itemsFor}
          t={t}
          onAddExpense={(key) => openNewItem(key)}
          onEditCategory={openEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onEditItem={openEditItem}
          onDeleteItem={handleDeleteItem}
        />
      ))}

      <CategoryForm form={catForm} setForm={setCatForm} onSave={handleSaveCategory} onClose={() => setCatForm(null)} t={t} />
      <ItemForm form={itemForm} setForm={setItemForm} cats={visibleCats} onSave={handleSaveItem} onClose={() => setItemForm(null)} t={t} />
    </div>
  );
}

function Stat({ label, value, tone = "ink" }) {
  const color =
    tone === "kk" ? "text-kk-700" : tone === "hp" ? "text-hp-700" : tone === "gold" ? "text-gold-700" : "text-ink-900";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function IconBtn({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
    >
      {children}
    </button>
  );
}

function WeddingBudget({ wedding, cats, itemsFor, t, onAddExpense, onEditCategory, onDeleteCategory, onEditItem, onDeleteItem }) {
  const currency = wedding.currency;
  const planned = cats.reduce((s, c) => s + Number(c.planned), 0);
  const actual = cats.reduce((s, c) => s + itemsFor(c.code, c.category).reduce((a, i) => a + Number(i.actual), 0), 0);
  const usedPct = pct(actual, planned);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{wedding.flag}</span>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">{wedding.city.en} · {currency}</h3>
            <p className="text-xs text-ink-500">
              {formatMoney(actual, currency)} / {formatMoney(planned, currency)} · {usedPct}% {t("budget.used")}
            </p>
          </div>
        </div>
        <Badge tone={wedding.code === "HP" ? "hp" : "kk"}>{wedding.code}</Badge>
      </div>

      <CardBody className="space-y-5">
        {cats.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">{t("budget.noCategories")}</p>
        ) : (
          cats.map((c) => {
            const catItems = itemsFor(c.code, c.category);
            const catActual = catItems.reduce((a, i) => a + Number(i.actual), 0);
            const over = catActual > c.planned;
            const remaining = Number(c.planned) - catActual;
            return (
              <div key={c.id} className="rounded-xl border border-ink-100">
                {/* Category header */}
                <div className="group flex items-center gap-3 px-4 pt-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-ink-800">{c.category}</span>
                      <span className={over ? "text-red-600" : "text-ink-600"}>
                        {formatMoney(catActual, currency)}
                        <span className="text-ink-400"> / {formatMoney(c.planned, currency)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 relative h-2 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-red-500" : "bg-kk-500"}`}
                        style={{ width: `${Math.min(100, pct(catActual, c.planned))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink-400">
                      {remaining >= 0
                        ? `${formatMoney(remaining, currency)} ${t("budget.remaining").toLowerCase()}`
                        : `${formatMoney(-remaining, currency)} ${t("budget.overBudget").toLowerCase()}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 self-start opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <IconBtn label={t("common.edit")} onClick={() => onEditCategory(c)}>✎</IconBtn>
                    <IconBtn label={t("common.delete")} onClick={() => onDeleteCategory(c)}>🗑</IconBtn>
                  </div>
                </div>

                {/* Expense items */}
                <ul className="mt-2 divide-y divide-ink-100 border-t border-ink-100">
                  {catItems.length === 0 ? (
                    <li className="px-4 py-2 text-xs text-ink-400">{t("budget.noExpenses")}</li>
                  ) : (
                    catItems.map((it) => (
                      <li key={it.id} className="group/item flex items-center gap-2 px-4 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-ink-700">{it.label || "—"}</span>
                        <span className="text-ink-600">{formatMoney(it.actual, currency)}</span>
                        <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover/item:opacity-100">
                          <IconBtn label={t("common.edit")} onClick={() => onEditItem(it)}>✎</IconBtn>
                          <IconBtn label={t("common.delete")} onClick={() => onDeleteItem(it)}>🗑</IconBtn>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                <div className="px-4 py-2">
                  <button
                    onClick={() => onAddExpense(`${c.code}|${c.category}`)}
                    className="text-xs font-medium text-kk-700 hover:text-kk-800"
                  >
                    + {t("budget.addExpense")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

function CategoryForm({ form, setForm, onSave, onClose, t }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const editing = !!form.id;
  return (
    <Modal
      open={!!form}
      onClose={onClose}
      title={editing ? t("budget.editCategory") : t("budget.newCategory")}
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
            <select className="input" value={form.code} onChange={set("code")} disabled={editing}>
              {WEDDING_LIST.map((w) => (
                <option key={w.code} value={w.code}>{w.flag} {w.city.en} ({w.currency})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("budget.categoryName")}</label>
            <input className="input" value={form.category} onChange={set("category")} disabled={editing} autoFocus={!editing} />
          </div>
        </div>
        <div>
          <label className="label">{t("budget.plannedAmount")} ({WEDDINGS[form.code]?.currency})</label>
          <input className="input" type="number" min="0" value={form.planned} onChange={set("planned")} autoFocus={editing} />
        </div>
      </form>
    </Modal>
  );
}

function ItemForm({ form, setForm, cats, onSave, onClose, t }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [code] = form.categoryKey.split("|");
  const currency = WEDDINGS[code]?.currency;
  return (
    <Modal
      open={!!form}
      onClose={onClose}
      title={form.id ? t("budget.editExpense") : t("budget.newExpense")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={onSave}>{t("common.save")}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <div>
          <label className="label">{t("budget.category")}</label>
          <select className="input" value={form.categoryKey} onChange={set("categoryKey")}>
            {cats.map((c) => (
              <option key={`${c.code}|${c.category}`} value={`${c.code}|${c.category}`}>
                {WEDDINGS[c.code]?.flag} {c.category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("budget.description")}</label>
          <input className="input" value={form.label} onChange={set("label")} autoFocus />
        </div>
        <div>
          <label className="label">{t("budget.amount")} ({currency})</label>
          <input className="input" type="number" min="0" value={form.actual} onChange={set("actual")} />
        </div>
      </form>
    </Modal>
  );
}
