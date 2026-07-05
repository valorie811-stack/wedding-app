import AppShell from "@/components/layout/AppShell";
import { getCurrentMember } from "@/lib/data";

export default async function AppLayout({ children }) {
  const member = await getCurrentMember();
  return <AppShell member={member}>{children}</AppShell>;
}
