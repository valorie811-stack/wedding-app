import { getDashboardSource } from "@/lib/data";
import { getRates } from "@/lib/fx";
import DashboardView from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Same rate table the Combined Finance page uses. Without it this page fell
  // back to the static rates in lib/format.js and the two disagreed on the
  // combined AUD total whenever EXCHANGE_RATE_API_KEY was set.
  const [{ source, preview }, fx] = await Promise.all([getDashboardSource(), getRates()]);
  return <DashboardView source={source} preview={preview} rates={fx.rates} />;
}
