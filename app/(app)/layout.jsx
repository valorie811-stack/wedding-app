import AppShell from "@/components/layout/AppShell";
import { getCurrentMember } from "@/lib/data";

export default async function AppLayout({ children }) {
  const member = await getCurrentMember();
  // Preview fallback so the shell renders before Supabase is connected.
  const effective = member || { full_name: "Owner (preview)", role: "owner", locale: "en" };
  return <AppShell member={effective}>{children}</AppShell>;
}
