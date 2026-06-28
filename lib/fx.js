import "server-only";
import { FX_TO_AUD } from "@/lib/format";

// In-memory cache so we don't hit the FX API on every render.
let cache = null;
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// Returns { rates: { AUD, VND, MYR }, live, fetchedAt }.
// rates[X] = value of 1 unit of X in AUD.
// Live rates from exchangerate-api.com v6 when EXCHANGE_RATE_API_KEY is set;
// otherwise the static rates from lib/format.js (so it always works offline).
export async function getRates() {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;

  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (key) {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/AUD`, {
        next: { revalidate: 21600 },
      });
      const json = await res.json();
      if (json?.result === "success" && json.conversion_rates) {
        const cr = json.conversion_rates; // AUD -> X
        cache = {
          rates: {
            AUD: 1,
            VND: cr.VND ? 1 / cr.VND : FX_TO_AUD.VND,
            MYR: cr.MYR ? 1 / cr.MYR : FX_TO_AUD.MYR,
          },
          live: true,
          fetchedAt: Date.now(),
        };
        return cache;
      }
    } catch {
      /* fall through to static rates */
    }
  }

  // Don't cache the fallback so a later key/network fix is picked up promptly.
  return { rates: FX_TO_AUD, live: false, fetchedAt: Date.now() };
}
