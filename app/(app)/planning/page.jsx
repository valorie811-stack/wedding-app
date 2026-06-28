import { getTasksData } from "@/lib/data";
import PlanningView from "@/components/planning/PlanningView";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const { tasks, preview } = await getTasksData();
  return <PlanningView tasks={tasks} preview={preview} />;
}
