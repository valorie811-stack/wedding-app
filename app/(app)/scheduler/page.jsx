import { getCalendarData } from "@/lib/data";
import CalendarView from "@/components/calendar/CalendarView";

export const dynamic = "force-dynamic";

export default async function SchedulerPage() {
  const { events, tasks, preview } = await getCalendarData();
  return <CalendarView events={events} tasks={tasks} preview={preview} />;
}
