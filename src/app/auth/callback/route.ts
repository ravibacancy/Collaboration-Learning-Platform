import { NextResponse } from "next/server";
import { getSupabasePublicEnvError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl.origin;

  if (getSupabasePublicEnvError()) {
    return NextResponse.redirect(`${origin}/login?error=Supabase%20configuration%20is%20invalid`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing%20auth%20code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
