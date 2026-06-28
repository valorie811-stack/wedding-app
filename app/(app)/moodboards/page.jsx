import { getMoodboardData } from "@/lib/data";
import MoodboardsView from "@/components/moodboards/MoodboardsView";

export const dynamic = "force-dynamic";

export default async function MoodboardsPage() {
  const { items, preview } = await getMoodboardData();
  return <MoodboardsView items={items} preview={preview} />;
}
