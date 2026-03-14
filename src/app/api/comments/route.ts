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
  const documentId = url.searchParams.get("documentId");
  const limit = parseLimit(url.searchParams.get("limit"));

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("id,body,user_id,created_at,document_id")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [] });
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
    body?: string;
    mentionUserId?: string;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const classroomId = String(payload.classroomId ?? "").trim();
  const documentId = String(payload.documentId ?? "").trim();
  const body = String(payload.body ?? "").trim();
  const mentionUserId = String(payload.mentionUserId ?? "").trim();

  if (!classroomId || !documentId || !body) {
    return NextResponse.json({ error: "classroomId, documentId, and body are required" }, { status: 400 });
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({ document_id: documentId, user_id: auth.user.id, body })
    .select("id,body,user_id,created_at,document_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("analytics_events").insert({
    classroom_id: classroomId,
    document_id: documentId,
    user_id: auth.user.id,
    event_type: "comment_created",
    event_data: {
      length: body.length,
      mentioned: Boolean(mentionUserId),
    },
  });

  const { data: document } = await supabase
    .from("documents")
    .select("owner_id,title")
    .eq("id", documentId)
    .single();

  const targets = new Set<string>();
  if (mentionUserId) {
    targets.add(mentionUserId);
  }
  if (document?.owner_id) {
    targets.add(document.owner_id);
  }
  targets.delete(auth.user.id);

  const notifications = Array.from(targets).map((userId) => ({
    user_id: userId,
    sender_id: auth.user.id,
    type: mentionUserId === userId ? "mention" : "comment",
    title: mentionUserId === userId ? "You were mentioned in a comment" : "New comment on document",
    body: document?.title ?? body.slice(0, 60),
    reference_type: "document",
    reference_id: documentId,
  }));

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ comment }, { status: 201 });
}
