"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getSupabasePublicEnvError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function getOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function normalizeRedirectTarget(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function redirectWithConfigError(target: string) {
  redirect(
    `${target}?error=Supabase%20is%20not%20configured.%20Set%20real%20NEXT_PUBLIC_SUPABASE_URL%20and%20NEXT_PUBLIC_SUPABASE_ANON_KEY%20in%20.env.local`,
  );
}

export async function signInWithPassword(formData: FormData) {
  const redirectTarget = normalizeRedirectTarget(String(formData.get("redirect_to") ?? ""), "/login");

  if (getSupabasePublicEnvError()) {
    redirectWithConfigError(redirectTarget);
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
      redirect(`${redirectTarget}?error=${encodeURIComponent(message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (error) {
    unstable_rethrow(error);
    redirect(`${redirectTarget}?error=${encodeURIComponent(error instanceof Error ? error.message : "Sign in failed")}`);
  }
}

export async function signUpWithPassword(formData: FormData) {
  const redirectTarget = normalizeRedirectTarget(String(formData.get("redirect_to") ?? ""), "/signup");

  if (getSupabasePublicEnvError()) {
    redirectWithConfigError(redirectTarget);
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${getOrigin()}/auth/callback`,
      },
    });

    if (error) {
      redirect(`${redirectTarget}?error=${encodeURIComponent(error.message)}`);
    }

    if (data.session) {
      revalidatePath("/", "layout");
      redirect("/dashboard");
    }

    redirect(
      `${redirectTarget}?message=Check your email to confirm your account. If email is not delivered, disable Confirm email in Supabase Auth for local testing.`,
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(`${redirectTarget}?error=${encodeURIComponent(error instanceof Error ? error.message : "Sign up failed")}`);
  }
}

export async function signInWithGoogle(formData: FormData) {
  const redirectTarget = normalizeRedirectTarget(String(formData.get("redirect_to") ?? ""), "/login");

  if (getSupabasePublicEnvError()) {
    redirectWithConfigError(redirectTarget);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getOrigin()}/auth/callback`,
      },
    });

    if (error || !data.url) {
      redirect(`${redirectTarget}?error=${encodeURIComponent(error?.message ?? "Unable to sign in with Google")}`);
    }

    redirect(data.url);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`${redirectTarget}?error=${encodeURIComponent(error instanceof Error ? error.message : "Google sign in failed")}`);
  }
}

export async function signOut() {
  if (getSupabasePublicEnvError()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

