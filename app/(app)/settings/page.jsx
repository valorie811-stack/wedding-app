import SettingsView from "@/components/settings/SettingsView";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView canPersist={isAdminConfigured} />;
}
