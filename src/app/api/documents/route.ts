import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const STATUS_VALUES = ["draft", "active", "archived"] as const;
type DocumentStatus = (typeof STATUS_VALUES)[number];

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
  const classroomId = url.searchParams.get("classroomId");
  const includeAll = url.searchParams.get("all") === "1";

  if (includeAll && isAdminEmail(auth.user.email)) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("documents")
      .select("id,title,file_type,file_path,status,created_at,classroom_id,owner_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  }

  if (classroomId) {
    const role = await getMembershipRole(supabase, classroomId, auth.user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("documents")
      .select("id,title,file_type,file_path,status,created_at,classroom_id,owner_id")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .eq("user_id", auth.user.id);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const classroomIds = (memberships ?? []).map((item) => item.classroom_id);
  if (classroomIds.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id,title,file_type,file_path,status,created_at,classroom_id,owner_id")
    .in("classroom_id", classroomIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    classroomId?: string;
    title?: string;
    fileType?: string;
    filePath?: string;
    status?: string;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const classroomId = String(payload.classroomId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const filePath = String(payload.filePath ?? "").trim();
  const fileType = String(payload.fileType ?? "pdf").trim() || "pdf";
  const statusRaw = String(payload.status ?? "active").trim() || "active";
  const status = (STATUS_VALUES.includes(statusRaw as DocumentStatus) ? statusRaw : "active") as DocumentStatus;

  if (!classroomId || !title || !filePath) {
    return NextResponse.json({ error: "classroomId, title, and filePath are required" }, { status: 400 });
  }

  const role = await getMembershipRole(supabase, classroomId, auth.user.id);
  if (!role || (role !== "owner" && role !== "teacher")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      classroom_id: classroomId,
      owner_id: auth.user.id,
      title,
      file_path: filePath,
      file_type: fileType,
      status,
    })
    .select("id,title,file_type,file_path,status,created_at,classroom_id,owner_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}
