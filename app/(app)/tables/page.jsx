import { getSeatingData } from "@/lib/data";
import TablesView from "@/components/tables/TablesView";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const { tables, assignments, guests, preview } = await getSeatingData();
  return <TablesView tables={tables} assignments={assignments} guests={guests} preview={preview} />;
}
