import { getDashboardSource } from "@/lib/data";
import DashboardView from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { source, preview } = await getDashboardSource();
  return <DashboardView source={source} preview={preview} />;
}
