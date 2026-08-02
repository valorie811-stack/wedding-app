// Per-wedding visual identity. Both weddings share a muted gold accent;
// Hai Phong leans terracotta, Kota Kinabalu leans sea teal.
//
// Hex values are read from lib/tokens.js rather than written inline, so charts,
// PDF documents and HTML email stay in sync with the Tailwind palette.
import tokens from "@/lib/tokens";

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
    hex: { base: tokens.hp[600], soft: tokens.hp[100], text: tokens.hp[800] },
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
    hex: { base: tokens.kk[600], soft: tokens.kk[100], text: tokens.kk[800] },
  },
};

export const WEDDING_LIST = [WEDDINGS.HP, WEDDINGS.KK];

// "BOTH" | "HP" | "KK"  → list of wedding objects in scope
export function weddingsInScope(scope) {
  if (scope === "HP") return [WEDDINGS.HP];
  if (scope === "KK") return [WEDDINGS.KK];
  return WEDDING_LIST;
}
