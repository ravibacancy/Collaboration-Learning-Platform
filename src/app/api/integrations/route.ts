import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: string | null) {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const classroomId = url.searchParams.get("classroomId");
  const limit = parseLimit(url.searchParams.get("limit"));

  let query = supabase
    .from("integration_connections")
    .select("id,provider,status,display_name,external_class_id,classroom_id,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (classroomId) {
    query = query.eq("classroom_id", classroomId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integrations: data ?? [] });
}
