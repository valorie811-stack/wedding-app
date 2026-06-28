import { getBudgetData } from "@/lib/data";
import BudgetView from "@/components/budget/BudgetView";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const { items, preview } = await getBudgetData();
  return <BudgetView items={items} preview={preview} />;
}
