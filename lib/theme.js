// Per-wedding visual identity. Both weddings share a gold accent;
// Hai Phong leans red, Kota Kinabalu leans teal.
export const WEDDINGS = {
  HP: {
    code: "HP",
    flag: "🇻🇳",
    city: { en: "Hải Phòng", vi: "Hải Phòng", zh: "海防" },
    country: { en: "Vietnam", vi: "Việt Nam", zh: "越南" },
    date: "2027-10-08T09:00:00+07:00",
    dateRange: "8–10 October 2027",
    currency: "VND",
    accent: "hp",
    // Tailwind-resolved hex for charts / inline styles
    hex: { base: "#be123c", soft: "#fee2e2", text: "#9f1239" },
  },
  KK: {
    code: "KK",
    flag: "🇲🇾",
    city: { en: "Kota Kinabalu", vi: "Kota Kinabalu", zh: "亚庇" },
    country: { en: "Malaysia", vi: "Malaysia", zh: "马来西亚" },
    date: "2027-10-16T09:00:00+08:00",
    dateRange: "16–17 October 2027",
    currency: "MYR",
    accent: "kk",
    hex: { base: "#0d9488", soft: "#ccfbf1", text: "#0f766e" },
  },
};

export const WEDDING_LIST = [WEDDINGS.HP, WEDDINGS.KK];

// "BOTH" | "HP" | "KK"  → list of wedding objects in scope
export function weddingsInScope(scope) {
  if (scope === "HP") return [WEDDINGS.HP];
  if (scope === "KK") return [WEDDINGS.KK];
  return WEDDING_LIST;
}
