// Client-side export helpers.
// XLSX uses SheetJS loaded from the official CDN (NOT the npm package — avoids
// CVE-2023-30533). CSV is built locally so it works with no network.

const SHEETJS_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

let sheetjsPromise;

export function loadSheetJS() {
  if (typeof window !== "undefined" && window.XLSX) return Promise.resolve(window.XLSX);
  if (sheetjsPromise) return sheetjsPromise;
  sheetjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SHEETJS_CDN;
    s.async = true;
    s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error("SheetJS unavailable")));
    s.onerror = () => reject(new Error("SheetJS failed to load"));
    document.head.appendChild(s);
  });
  return sheetjsPromise;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportXLSX(rows, { sheetName = "Sheet1", filename = "export.xlsx" } = {}) {
  const XLSX = await loadSheetJS();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

export function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\r\n");
}

export function downloadCSV(rows, filename = "export.csv") {
  // BOM so Excel reads UTF-8 (Vietnamese / Chinese names) correctly.
  const blob = new Blob(["﻿" + toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}
