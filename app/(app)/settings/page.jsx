import { getMembersData } from "@/lib/data";
import SettingsView from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { members, invites, currentRole, preview } = await getMembersData();
  return (
    <SettingsView members={members} invites={invites} currentRole={currentRole} preview={preview} />
  );
}
