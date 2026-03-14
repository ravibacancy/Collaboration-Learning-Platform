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
  const documentId = url.searchParams.get("documentId");

  let query = supabase
    .from("assignments")
    .select("id,title,instructions,due_at,published_at,document_id,classroom_id,published_by")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (classroomId) {
    query = query.eq("classroom_id", classroomId);
  }
  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    classroomId?: string;
    documentId?: string;
    title?: string;
    instructions?: string;
    dueAt?: string;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const classroomId = String(payload.classroomId ?? "").trim();
  const documentId = String(payload.documentId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const instructions = String(payload.instructions ?? "").trim();
  const dueAt = String(payload.dueAt ?? "").trim();

  if (!classroomId || !documentId || !title) {
    return NextResponse.json({ error: "classroomId, documentId, and title are required" }, { status: 400 });
  }

  const role = await getMembershipRole(supabase, classroomId, auth.user.id);
  if (!role || (role !== "owner" && role !== "teacher")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      classroom_id: classroomId,
      document_id: documentId,
      title,
      instructions: instructions || null,
      due_at: dueAt || null,
      published_by: auth.user.id,
    })
    .select("id,title,instructions,due_at,published_at,document_id,classroom_id,published_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: students } = await supabase
    .from("classroom_members")
    .select("user_id")
    .eq("classroom_id", classroomId)
    .eq("role", "student");

  const notifications = (students ?? [])
    .filter((item) => item.user_id !== auth.user.id)
    .map((item) => ({
      user_id: item.user_id,
      sender_id: auth.user.id,
      type: "assignment",
      title: "New assignment",
      body: title,
      reference_type: "assignment",
      reference_id: assignment.id,
    }));

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  await supabase.from("analytics_events").insert({
    classroom_id: classroomId,
    document_id: documentId,
    user_id: auth.user.id,
    event_type: "assignment_published",
    event_data: { assignment_id: assignment.id },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
