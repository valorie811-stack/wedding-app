import { isPinConfigured } from "@/lib/auth/pin";
import { isAdminConfigured } from "@/lib/supabase/admin";
import PinForm from "@/components/auth/PinForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = await isPinConfigured();
  return <PinForm mode={configured ? "verify" : "setup"} canPersist={isAdminConfigured} />;
}
