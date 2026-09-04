import { getTasksData } from "@/lib/data";
import PlanningView from "@/components/planning/PlanningView";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const { tasks, vendors, events, preview } = await getTasksData();
  return <PlanningView tasks={tasks} vendors={vendors} events={events} preview={preview} />;
}
