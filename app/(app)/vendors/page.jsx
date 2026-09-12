import { getVendorsData } from "@/lib/data";
import { getRates } from "@/lib/fx";
import VendorsView from "@/components/vendors/VendorsView";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const [{ vendors, categories, preview }, fx] = await Promise.all([
    getVendorsData(),
    getRates(),
  ]);
  return (
    <VendorsView vendors={vendors} categories={categories} preview={preview} rates={fx.rates} />
  );
}
