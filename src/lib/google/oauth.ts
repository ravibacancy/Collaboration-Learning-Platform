import "server-only";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in environment.`);
  }
  return value;
}

export function getGoogleOAuthConfig() {
  return {
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: process.env.GOOGLE_CLASSROOM_REDIRECT_URI ?? `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/integrations/google/callback`,
  };
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to exchange OAuth code.");
  }

  return data;
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to refresh OAuth token.");
  }

  return data;
}
