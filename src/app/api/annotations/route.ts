import { NextResponse } from "next/server";
import type { Json } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

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
  const documentId = url.searchParams.get("documentId");
  const limit = parseLimit(url.searchParams.get("limit"));

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("annotations")
    .select("id,annotation_type,page_number,content,user_id,created_at,document_id")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annotations: data ?? [] });
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
    annotationType?: string;
    pageNumber?: number;
    content?: Json;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const classroomId = String(payload.classroomId ?? "").trim();
  const documentId = String(payload.documentId ?? "").trim();
  const annotationType = String(payload.annotationType ?? "").trim();
  const pageNumber = Number(payload.pageNumber ?? 1);

  if (!classroomId || !documentId || !annotationType) {
    return NextResponse.json({ error: "classroomId, documentId, and annotationType are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("annotations")
    .insert({
      document_id: documentId,
      user_id: auth.user.id,
      annotation_type: annotationType,
      page_number: Number.isFinite(pageNumber) ? Math.max(1, pageNumber) : 1,
      content: payload.content ?? {},
    })
    .select("id,annotation_type,page_number,content,user_id,created_at,document_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("analytics_events").insert({
    classroom_id: classroomId,
    document_id: documentId,
    user_id: auth.user.id,
    event_type: "annotation_created",
    event_data: {
      annotation_type: annotationType,
      page_number: Number.isFinite(pageNumber) ? Math.max(1, pageNumber) : 1,
    },
  });

  return NextResponse.json({ annotation: data }, { status: 201 });
}
