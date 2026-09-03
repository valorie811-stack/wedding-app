import { getVendorsData } from "@/lib/data";
import VendorsView from "@/components/vendors/VendorsView";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const { vendors, categories, preview } = await getVendorsData();
  return <VendorsView vendors={vendors} categories={categories} preview={preview} />;
}
