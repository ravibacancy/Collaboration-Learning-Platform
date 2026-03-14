import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: string | null) {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

async function getMembershipRole(supabase: Awaited<ReturnType<typeof createClient>>, classroomId: string, userId: string) {
  const { data } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const includeAll = url.searchParams.get("all") === "1";

  if (includeAll && isAdminEmail(auth.user.email)) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("classrooms")
      .select("id,name,description,join_code,created_at,owner_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ classrooms: data ?? [] });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("classroom_members")
    .select("classroom_id,role")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const classroomIds = (memberships ?? []).map((item) => item.classroom_id);
  if (classroomIds.length === 0) {
    return NextResponse.json({ classrooms: [] });
  }

  const { data: classrooms, error: classroomError } = await supabase
    .from("classrooms")
    .select("id,name,description,join_code,created_at,owner_id")
    .in("id", classroomIds)
    .limit(limit);

  if (classroomError) {
    return NextResponse.json({ error: classroomError.message }, { status: 500 });
  }

  const roleMap = new Map((memberships ?? []).map((member) => [member.classroom_id, member.role]));

  return NextResponse.json({
    classrooms: (classrooms ?? []).map((room) => ({
      ...room,
      role: roleMap.get(room.id) ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { name?: string; description?: string } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("classrooms")
    .insert({ owner_id: auth.user.id, name, description: description || null })
    .select("id,name,description,join_code,created_at,owner_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const role = await getMembershipRole(supabase, data.id, auth.user.id);

  return NextResponse.json({ classroom: { ...data, role } }, { status: 201 });
}
