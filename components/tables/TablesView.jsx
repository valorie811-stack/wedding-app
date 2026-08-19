"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { weddingsInScope } from "@/lib/theme";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { saveTable, deleteTable, assignGuest, unassignGuest } from "@/app/(app)/tables/actions";
import useOptimisticWrite, { newTempId } from "@/components/hooks/useOptimisticWrite";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Icon from "@/components/ui/Icon";

// A plus one has no guest record of its own, so it cannot be dragged or seated
// separately — one chip covers the pair, and they always move together.
function ChipLabel({ guest }) {
  if (!guest.plus_one) return guest.full_name;
  return (
    <>
      {guest.full_name}
      <span className="opacity-70">
        {" +1"}
        {guest.plus_one_name ? ` ${guest.plus_one_name}` : ""}
      </span>
    </>
  );
}

// Seats, not chips: a guest bringing someone takes two places at the table.
const seatsFor = (guest) => (guest?.plus_one ? 2 : 1);

export default function TablesView({ tables: initTables, assignments: initAsg, guests, preview }) {
  const { t, scope } = useApp();
  const [tables, setTables] = useState(initTables);
  const [assignments, setAssignments] = useState(initAsg);
  const [drag, setDrag] = useState(null); // { guestId, code, fromTableId }
  const [form, setForm] = useState(null);
  const { error, dismissError, run } = useOptimisticWrite();

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const weddings = weddingsInScope(scope);

  function doAssign(tableId, guestId, code) {
    const wTableIds = new Set(tables.filter((t) => t.code === code).map((t) => t.id));
    // Seating a guest clears any other seat they hold at the same wedding, so a
    // failed assign has to restore the whole previous assignment list.
    const previous = assignments;
    run({
      apply: () =>
        setAssignments((prev) => [
          ...prev.filter((a) => !(a.guest_id === guestId && wTableIds.has(a.table_id))),
          { id: newTempId(), table_id: tableId, guest_id: guestId },
        ]),
      action: () => assignGuest(tableId, guestId),
      revert: () => setAssignments(previous),
      message: t("common.saveFailed"),
    });
  }
  function doUnassign(tableId, guestId) {
    const removed = assignments.filter((a) => a.guest_id === guestId && a.table_id === tableId);
    run({
      apply: () =>
        setAssignments((prev) =>
          prev.filter((a) => !(a.guest_id === guestId && a.table_id === tableId))
        ),
      action: () => unassignGuest(tableId, guestId),
      revert: () => setAssignments((prev) => [...prev, ...removed]),
      message: t("common.deleteFailed"),
    });
  }

  function openNewTable(code) {
    setForm({ id: null, code, name: "", capacity: "8" });
  }
  function openEditTable(tbl) {
    setForm({ id: tbl.id, code: tbl.code, name: tbl.name, capacity: String(tbl.capacity) });
  }
  function handleSaveTable() {
    if (!form.name.trim()) return;
    const payload = { id: form.id, code: form.code, name: form.name.trim(), capacity: Number(form.capacity) || 8 };
    const editingId = form.id;
    const previousRow = editingId ? tables.find((tb) => tb.id === editingId) : null;
    const tempId = newTempId();
    setForm(null);

    run({
      apply: () =>
        setTables((prev) => {
          if (editingId) return prev.map((tb) => (tb.id === editingId ? { ...tb, ...payload } : tb));
          const sort_order = prev.filter((tb) => tb.code === payload.code).length + 1;
          return [...prev, { ...payload, sort_order, id: tempId }];
        }),
      action: () => saveTable(payload),
      revert: () =>
        setTables((prev) =>
          editingId
            ? prev.map((tb) => (tb.id === editingId && previousRow ? previousRow : tb))
            : prev.filter((tb) => tb.id !== tempId)
        ),
      adopt: (id) => setTables((prev) => prev.map((tb) => (tb.id === tempId ? { ...tb, id } : tb))),
      message: t("common.saveFailed"),
    });
  }
  function handleDeleteTable(tbl) {
    if (!window.confirm(t("tables.deleteTableConfirm"))) return;
    // Deleting a table cascades to its seat assignments, so both come back
    // together if the delete fails.
    const index = tables.findIndex((x) => x.id === tbl.id);
    const seated = assignments.filter((a) => a.table_id === tbl.id);
    run({
      apply: () => {
        setTables((prev) => prev.filter((x) => x.id !== tbl.id));
        setAssignments((prev) => prev.filter((a) => a.table_id !== tbl.id));
      },
      action: () => deleteTable(tbl.id),
      revert: () => {
        setTables((prev) => {
          const next = [...prev];
          next.splice(index < 0 ? next.length : index, 0, tbl);
          return next;
        });
        setAssignments((prev) => [...prev, ...seated]);
      },
      message: t("common.deleteFailed"),
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">{t("tables.title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("tables.subtitle")}</p>
        </div>
        {preview && <Badge tone="amber"><Icon name="warning" size={12} />{t("common.preview")}</Badge>}
      </div>

      <ErrorBanner
        error={error}
        onDismiss={dismissError}
        dismissLabel={t("common.close")}
        detailsLabel={t("common.errorDetails")}
      />

      {weddings.map((w) => {
        const wTables = tables.filter((tb) => tb.code === w.code).sort((a, b) => a.sort_order - b.sort_order);
        const wTableIds = new Set(wTables.map((tb) => tb.id));
        const assignedIds = new Set(assignments.filter((a) => wTableIds.has(a.table_id)).map((a) => a.guest_id));
        const pool = guests.filter((g) => g.codes.includes(w.code) && !assignedIds.has(g.id));

        return (
          <section key={w.code} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-stone-800">
                <span>{w.flag}</span> {w.city.en}
                <Badge tone={w.code === "HP" ? "hp" : "kk"}>{w.code}</Badge>
              </h2>
              <Button variant="outline" size="sm" onClick={() => openNewTable(w.code)}>
                + {t("tables.addTable")}
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Unassigned pool */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag && drag.code === w.code && drag.fromTableId) doUnassign(drag.fromTableId, drag.guestId);
                  setDrag(null);
                }}
                className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-3"
              >
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {t("tables.unassigned")} · {pool.length}
                </p>
                {pool.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-stone-400">{t("tables.poolEmpty")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {pool.map((g) => (
                      <span
                        key={g.id}
                        draggable
                        onDragStart={() => setDrag({ guestId: g.id, code: w.code, fromTableId: null })}
                        onDragEnd={() => setDrag(null)}
                        className="cursor-grab rounded-full bg-white px-2.5 py-1 text-xs text-stone-700 shadow-card active:cursor-grabbing"
                      >
                        <ChipLabel guest={g} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tables */}
              {wTables.length === 0 ? (
                <div className="lg:col-span-2 grid place-items-center rounded-2xl border border-dashed border-stone-200 py-10 text-sm text-stone-400">
                  {t("tables.noTables")}
                </div>
              ) : (
                wTables.map((tbl) => {
                  const seated = assignments
                    .filter((a) => a.table_id === tbl.id)
                    .map((a) => ({ asg: a, guest: guestById.get(a.guest_id) }))
                    .filter((x) => x.guest);
                  // Counts seats rather than chips, so a table filled with
                  // guests who are each bringing someone reports honestly.
                  const seats = seated.reduce((n, x) => n + seatsFor(x.guest), 0);
                  const over = seats > tbl.capacity;
                  return (
                    <div
                      key={tbl.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (drag && drag.code === w.code) doAssign(tbl.id, drag.guestId, w.code);
                        setDrag(null);
                      }}
                      className="card flex flex-col p-3"
                    >
                      <div className="group mb-2 flex items-center justify-between gap-2">
                        <h3 className="font-medium text-stone-900">{tbl.name}</h3>
                        <div className="flex items-center gap-1">
                          <Badge tone={over ? "red" : "neutral"}>
                            {seats}/{tbl.capacity}
                          </Badge>
                          <button onClick={() => openEditTable(tbl)} aria-label={t("common.edit")} className="grid h-6 w-6 place-items-center rounded text-stone-400 opacity-100 transition hover:bg-stone-100 hover:text-stone-700 sm:opacity-0 sm:group-hover:opacity-100"><Icon name="edit" size={13} /></button>
                          <button onClick={() => handleDeleteTable(tbl)} aria-label={t("common.delete")} className="grid h-6 w-6 place-items-center rounded text-stone-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"><Icon name="trash" size={13} /></button>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-wrap content-start gap-1.5">
                        {seated.length === 0 && (
                          <p className="w-full py-3 text-center text-xs text-stone-300">{t("tables.dropHere")}</p>
                        )}
                        {seated.map(({ asg, guest }) => (
                          <span
                            key={asg.id}
                            draggable
                            onDragStart={() => setDrag({ guestId: guest.id, code: w.code, fromTableId: tbl.id })}
                            onDragEnd={() => setDrag(null)}
                            className="group/chip inline-flex cursor-grab items-center gap-1 rounded-full bg-kk-50 px-2.5 py-1 text-xs text-kk-800 active:cursor-grabbing"
                          >
                            <ChipLabel guest={guest} />
                            <button
                              onClick={() => doUnassign(tbl.id, guest.id)}
                              aria-label={t("common.remove")}
                              className="text-kk-500 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Non-drag add */}
                      {pool.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => e.target.value && doAssign(tbl.id, e.target.value, w.code)}
                          className="mt-2 rounded-lg border border-stone-500 bg-white px-2 py-1 text-xs text-stone-700"
                        >
                          <option value="">+ {t("tables.addGuest")}</option>
                          {pool.map((g) => (
                            <option key={g.id} value={g.id}>{g.full_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}

      <TableForm form={form} setForm={setForm} onSave={handleSaveTable} onClose={() => setForm(null)} t={t} />
    </div>
  );
}

function TableForm({ form, setForm, onSave, onClose, t }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      open={!!form}
      onClose={onClose}
      title={form.id ? t("tables.editTable") : t("tables.newTable")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={onSave}>{t("common.save")}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <div>
          <label className="label">{t("tables.tableName")}</label>
          <input className="input" value={form.name} onChange={set("name")} autoFocus />
        </div>
        <div>
          <label className="label">{t("tables.capacity")}</label>
          <input className="input" type="number" min="1" value={form.capacity} onChange={set("capacity")} />
        </div>
      </form>
    </Modal>
  );
}
