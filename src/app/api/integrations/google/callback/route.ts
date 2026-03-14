import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { exchangeCodeForTokens } from "@/lib/google/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/classrooms?oauth=error&reason=${encodeURIComponent(oauthError)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/classrooms?oauth=error", request.url));
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: oauthState } = await supabase
    .from("integration_oauth_states")
    .select("id,classroom_id,code_verifier")
    .eq("state", state)
    .eq("user_id", auth.user.id)
    .single();

  if (!oauthState) {
    return NextResponse.redirect(new URL("/classrooms?oauth=expired", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, oauthState.code_verifier);

    const { data: existingConnections } = await supabase
      .from("integration_connections")
      .select("id,external_class_id,display_name,config")
      .eq("classroom_id", oauthState.classroom_id)
      .eq("provider", "google_classroom");

    const existing = existingConnections?.[0];

    const { data: connection } = await supabase
      .from("integration_connections")
      .upsert(
        {
          classroom_id: oauthState.classroom_id,
          provider: "google_classroom",
          status: "connected",
          connected_by: auth.user.id,
          display_name: existing?.display_name ?? "Google Classroom",
          external_class_id: existing?.external_class_id ?? null,
          config: existing?.config ?? {},
        },
        { onConflict: "classroom_id,provider" },
      )
      .select("id")
      .single();

    if (!connection) {
      return NextResponse.redirect(new URL("/classrooms?oauth=error", request.url));
    }

    const service = createServiceClient();
    const { data: existingTokenRows } = await service
      .from("integration_tokens")
      .select("refresh_token")
      .eq("connection_id", connection.id);

    const existingToken = existingTokenRows?.[0];
    const refreshToken = tokens.refresh_token ?? existingToken?.refresh_token ?? null;
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;

    await service.from("integration_tokens").upsert(
      {
        connection_id: connection.id,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expires_at: expiresAt,
      },
      { onConflict: "connection_id" },
    );

    await supabase.from("integration_oauth_states").delete().eq("id", oauthState.id);

    return NextResponse.redirect(new URL(`/classrooms/${oauthState.classroom_id}/integrations?connected=1`, request.url));
  } catch (error) {
    await supabase.from("integration_oauth_states").delete().eq("id", oauthState.id);
    return NextResponse.redirect(
      new URL(`/classrooms/${oauthState.classroom_id}/integrations?connected=0&error=oauth`, request.url),
    );
  }
}
