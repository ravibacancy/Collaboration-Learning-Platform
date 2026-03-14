"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getSupabasePublicEnvError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

function getOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function redirectWithConfigError() {
  redirect("/admin-login?error=Supabase%20is%20not%20configured.%20Set%20real%20NEXT_PUBLIC_SUPABASE_URL%20and%20NEXT_PUBLIC_SUPABASE_ANON_KEY%20in%20.env.local");
}

export async function adminSignInWithPassword(formData: FormData) {
  if (getSupabasePublicEnvError()) {
    redirectWithConfigError();
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const message = error.message.includes("Email not confirmed")
        ? "Email not confirmed. Confirm your email or disable email confirmation in Supabase Auth for local dev."
        : error.message;
      redirect(`/admin-login?error=${encodeURIComponent(message)}`);
    }

    if (!isAdminEmail(email)) {
      await supabase.auth.signOut();
      redirect("/admin-login?error=You%20do%20not%20have%20admin%20access");
    }

    revalidatePath("/", "layout");
    redirect("/admin");
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin-login?error=${encodeURIComponent(error instanceof Error ? error.message : "Sign in failed")}`);
  }
}

export async function adminSignInWithGoogle() {
  if (getSupabasePublicEnvError()) {
    redirectWithConfigError();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getOrigin()}/auth/callback?next=/admin`,
      },
    });

    if (error || !data.url) {
      redirect(`/admin-login?error=${encodeURIComponent(error?.message ?? "Unable to sign in with Google")}`);
    }

    redirect(data.url);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin-login?error=${encodeURIComponent(error instanceof Error ? error.message : "Google sign in failed")}`);
  }
}
