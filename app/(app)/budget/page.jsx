import { getBudgetData } from "@/lib/data";
import BudgetView from "@/components/budget/BudgetView";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const { categories, items, commitments, preview } = await getBudgetData();
  return (
    <BudgetView categories={categories} items={items} commitments={commitments} preview={preview} />
  );
}
