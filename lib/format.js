// Static fallback FX rates (1 unit -> AUD). Phase 3 swaps these for a
// scheduled Open Exchange Rates fetch. Kept here so the combined AUD
// rollup works in Phase 1 without a live API.
export const FX_TO_AUD = {
  VND: 0.0000611, // ~1 AUD = 16,360 VND
  MYR: 0.345, // ~1 AUD = 2.90 MYR
  AUD: 1,
};

const LOCALE_BY_CURRENCY = { VND: "vi-VN", MYR: "ms-MY", AUD: "en-AU" };

// Vietnamese dong has no minor unit — nobody writes ₫250,000.00 — so VND is
// rendered whole. MYR and AUD do: a vendor deposit of RM 2,500.50 is a real
// amount, and the ternary below read `fractionless ? 0 : 0`, which rounded
// every currency to whole units and quietly dropped the cents.
export function formatMoney(amount, currency = "AUD") {
  const fractionless = currency === "VND";
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] || "en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: fractionless ? 0 : 2,
    }).format(amount || 0);
  } catch {
    return `${amount} ${currency}`;
  }
}

// Convert to AUD at a supplied rate table.
//
// `rates` is an argument rather than a module constant because the app has two
// sources for it: getRates() returns live rates when EXCHANGE_RATE_API_KEY is
// set, and FX_TO_AUD is the offline fallback. Reading the constant directly is
// what let the Combined Finance page (live) and the Dashboard, Budget and
// Vendors pages (static) print different AUD totals for the same money. The
// default keeps pure/offline callers working; every page passes rates through.
export function toAUD(amount, currency, rates = FX_TO_AUD) {
  return (Number(amount) || 0) * (rates?.[currency] ?? 0);
}

export function formatAUD(amount) {
  return formatMoney(amount, "AUD");
}

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
