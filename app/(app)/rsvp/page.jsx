import { getGuestsData } from "@/lib/data";
import RsvpView from "@/components/rsvp/RsvpView";

export const dynamic = "force-dynamic";

export default async function RsvpPage() {
  const { guests, events, preview } = await getGuestsData();
  return <RsvpView guests={guests} events={events} preview={preview} />;
}
