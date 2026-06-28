import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed the "middleware" file convention to "proxy".
// Logic is unchanged: refresh the Supabase session + guard protected routes.
export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
