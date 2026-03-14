import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleOAuthConfig } from "@/lib/google/oauth";

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students",
  "https://www.googleapis.com/auth/classroom.student-submissions.students.readonly",
];

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const classroomId = url.searchParams.get("classroomId");

  if (!classroomId) {
    return NextResponse.json({ error: "Missing classroomId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: membership } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", auth.user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "teacher")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const state = base64Url(randomBytes(16));
  const codeVerifier = base64Url(randomBytes(32));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());

  const { clientId, redirectUri } = getGoogleOAuthConfig();

  const { error } = await supabase.from("integration_oauth_states").insert({
    user_id: auth.user.id,
    classroom_id: classroomId,
    provider: "google_classroom",
    state,
    code_verifier: codeVerifier,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to start OAuth flow." }, { status: 500 });
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}
