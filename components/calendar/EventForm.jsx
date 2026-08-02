"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const EVENT_TYPES = ["ceremony", "reception", "gathering", "other"];

export const blankEvent = () => ({
  id: null,
  code: "",
  name: { en: "", vi: "", zh: "" },
  date: "",
  start: "",
  end: "",
  location: "",
  type: "ceremony",
  dress: "",
  halal: false,
  notes: "",
});

// Add / edit form for a single calendar event. Mirrors the GuestForm pattern:
// controlled `form` object owned by the parent, optimistic save on submit.
export default function EventForm({ form, setForm, onSave, onDelete, onClose, t }) {
  if (!form) return null;

  const setName = (k) => (e) =>
    setForm((f) => ({ ...f, name: { ...f.name, [k]: e.target.value } }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const isEdit = !!form.id;

  return (
    <Modal
      open={!!form}
      onClose={onClose}
      size="lg"
      title={isEdit ? t("calendar.editEvent") : t("calendar.newEvent")}
      footer={
        <>
          {isEdit && (
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
          <label className="label">{t("calendar.form.nameEn")}</label>
          <input className="input" value={form.name.en} onChange={setName("en")} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("calendar.form.nameVi")}</label>
            <input className="input" value={form.name.vi} onChange={setName("vi")} />
          </div>
          <div>
            <label className="label">{t("calendar.form.nameZh")}</label>
            <input className="input" value={form.name.zh} onChange={setName("zh")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("calendar.form.date")}</label>
            <input className="input" type="date" value={form.date} onChange={set("date")} />
          </div>
          <div>
            <label className="label">{t("calendar.form.type")}</label>
            <select className="input" value={form.type} onChange={set("type")}>
              {EVENT_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`calendar.types.${ty}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("calendar.form.start")}</label>
            <input className="input" type="time" value={form.start} onChange={set("start")} />
          </div>
          <div>
            <label className="label">{t("calendar.form.end")}</label>
            <input className="input" type="time" value={form.end} onChange={set("end")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("calendar.form.scope")}</label>
            <select className="input" value={form.code} onChange={set("code")}>
              <option value="">{t("calendar.form.shared")}</option>
              <option value="HP">{t("scope.HP")}</option>
              <option value="KK">{t("scope.KK")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("calendar.form.dressCode")}</label>
            <input className="input" value={form.dress} onChange={set("dress")} />
          </div>
        </div>

        <div>
          <label className="label">{t("calendar.form.location")}</label>
          <input className="input" value={form.location} onChange={set("location")} />
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-gold-600"
            checked={form.halal}
            onChange={(e) => setForm((f) => ({ ...f, halal: e.target.checked }))}
          />
          {t("calendar.form.halal")}
        </label>

        <div>
          <label className="label">{t("calendar.form.notes")}</label>
          <textarea className="input min-h-[3.5rem]" value={form.notes} onChange={set("notes")} />
        </div>
      </form>
    </Modal>
  );
}
