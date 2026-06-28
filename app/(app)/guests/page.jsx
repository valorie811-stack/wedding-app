import { getGuestsData } from "@/lib/data";
import GuestsView from "@/components/guests/GuestsView";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const { guests, events, preview } = await getGuestsData();
  return <GuestsView guests={guests} events={events} preview={preview} />;
}
