import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnvError } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  const issue = getSupabasePublicEnvError();

  if (issue) {
    throw new Error(`${issue} Update .env.local with real Supabase URL and anon key.`);
  }

  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
