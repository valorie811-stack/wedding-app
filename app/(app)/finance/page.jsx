import { getBudgetData } from "@/lib/data";
import { getRates } from "@/lib/fx";
import FinanceView from "@/components/finance/FinanceView";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [{ categories, items, preview }, fx] = await Promise.all([getBudgetData(), getRates()]);
  return (
    <FinanceView
      categories={categories}
      items={items}
      rates={fx.rates}
      fxLive={fx.live}
      preview={preview}
    />
  );
}
