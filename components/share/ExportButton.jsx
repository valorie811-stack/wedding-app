"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import { exportXLSX, downloadCSV } from "@/lib/export";

// getRows() must return an array of flat objects (column -> value).
export default function ExportButton({ getRows, filename = "export", sheetName = "Sheet1" }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function doExport(kind) {
    setOpen(false);
    setError(false);
    const rows = getRows() || [];
    if (!rows.length) return;
    try {
      if (kind === "csv") {
        downloadCSV(rows, `${filename}.csv`);
      } else {
        setBusy(true);
        await exportXLSX(rows, { sheetName, filename: `${filename}.xlsx` });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} disabled={busy}>
        {busy ? t("export.exporting") : `⬇ ${t("export.title")}`}
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-pop">
          <button
            onClick={() => doExport("xlsx")}
            className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          >
            📊 {t("export.excel")}
          </button>
          <button
            onClick={() => doExport("csv")}
            className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          >
            📄 {t("export.csv")}
          </button>
        </div>
      )}
      {error && <p className="absolute right-0 mt-1 w-56 text-right text-xs text-red-600">{t("export.failed")}</p>}
    </div>
  );
}
