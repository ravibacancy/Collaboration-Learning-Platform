import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ user: null, profile: null, isAdmin: false }, { status: 200 });
  }

  const { data: profile } = await supabase.from("profiles").select("id,full_name,created_at,updated_at").eq("id", auth.user.id).maybeSingle();

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile,
    isAdmin: isAdminEmail(auth.user.email),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { action?: string } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    payload = {};
  }

  if ((payload.action ?? "signout") === "signout") {
    await supabase.auth.signOut();
    return NextResponse.json({ status: "signed_out" });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
