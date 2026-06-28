// Static fallback FX rates (1 unit -> AUD). Phase 3 swaps these for a
// scheduled Open Exchange Rates fetch. Kept here so the combined AUD
// rollup works in Phase 1 without a live API.
export const FX_TO_AUD = {
  VND: 0.0000611, // ~1 AUD = 16,360 VND
  MYR: 0.345, // ~1 AUD = 2.90 MYR
  AUD: 1,
};

const LOCALE_BY_CURRENCY = { VND: "vi-VN", MYR: "ms-MY", AUD: "en-AU" };

export function formatMoney(amount, currency = "AUD") {
  const fractionless = currency === "VND";
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] || "en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: fractionless ? 0 : 0,
    }).format(amount || 0);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function toAUD(amount, currency) {
  return (amount || 0) * (FX_TO_AUD[currency] ?? 0);
}

export function formatAUD(amount) {
  return formatMoney(amount, "AUD");
}

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
