import { getAttireData } from "@/lib/data";
import AttireView from "@/components/attire/AttireView";

export const dynamic = "force-dynamic";

export default async function AttirePage() {
  const { items, preview } = await getAttireData();
  return <AttireView items={items} preview={preview} />;
}
