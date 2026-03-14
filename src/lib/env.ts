const PLACEHOLDER_MARKERS = ["YOUR_PROJECT_REF", "YOUR_SUPABASE_ANON_KEY", "YOUR_SUPABASE_SERVICE_ROLE_KEY"];

function hasPlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabasePublicEnvError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    return "Missing Supabase environment variables.";
  }

  if (hasPlaceholder(url) || hasPlaceholder(anonKey)) {
    return "Supabase environment variables still use placeholder values.";
  }

  if (!isValidUrl(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.";
  }

  return null;
}

export function isSupabasePublicEnvReady(): boolean {
  return getSupabasePublicEnvError() === null;
}
