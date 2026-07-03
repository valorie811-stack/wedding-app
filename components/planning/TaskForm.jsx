"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { WEDDING_LIST } from "@/lib/theme";

export const TASK_COLUMNS = ["todo", "in_progress", "done"];

export const blankTask = () => ({
  id: null,
  code: "HP",
  title: "",
  due: "",
  assignee: "",
  status: "todo",
});

// Shared add/edit form for a task (planning milestone). Used by both the
// Planning board and the Event Scheduler. `onDelete` is optional — when
// provided and editing an existing task, a Delete button is shown.
export default function TaskForm({ form, setForm, onSave, onDelete, onClose, t }) {
  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEdit = !!form.id;

  return (
    <Modal
      open={!!form}
      onClose={onClose}
      title={isEdit ? t("planning.editTask") : t("planning.newTask")}
      footer={
        <>
          {isEdit && onDelete && (
            <Button variant="outline" className="mr-auto text-red-600" onClick={() => onDelete(form.id)}>
              {t("common.delete")}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={onSave}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div>
          <label className="label">{t("planning.taskTitle")}</label>
          <input className="input" value={form.title} onChange={set("title")} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("common.wedding")}</label>
            <select className="input" value={form.code ?? ""} onChange={set("code")}>
              <option value="">↔ {t("common.shared")}</option>
              {WEDDING_LIST.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.flag} {w.city.en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("planning.status")}</label>
            <select className="input" value={form.status} onChange={set("status")}>
              {TASK_COLUMNS.map((c) => (
                <option key={c} value={c}>
                  {t(`planning.columns.${c}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("planning.dueDate")}</label>
            <input className="input" type="date" value={form.due} onChange={set("due")} />
          </div>
          <div>
            <label className="label">{t("planning.assignee")}</label>
            <input className="input" value={form.assignee} onChange={set("assignee")} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
