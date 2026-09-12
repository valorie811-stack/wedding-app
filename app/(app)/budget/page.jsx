import { getBudgetData } from "@/lib/data";
import { getRates } from "@/lib/fx";
import BudgetView from "@/components/budget/BudgetView";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const [{ categories, items, commitments, preview }, fx] = await Promise.all([
    getBudgetData(),
    getRates(),
  ]);
  return (
    <BudgetView
      categories={categories}
      items={items}
      commitments={commitments}
      preview={preview}
      rates={fx.rates}
    />
  );
}
