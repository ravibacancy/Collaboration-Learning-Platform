"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

function num(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePoints(value: FormDataEntryValue | null): Array<{ x: number; y: number }> | null {
  if (!value) {
    return null;
  }

  const raw = typeof value === "string" ? value : "";
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const points = parsed
      .map((point) => ({
        x: Math.max(0, Math.min(100, Number(point?.x ?? 0))),
        y: Math.max(0, Math.min(100, Number(point?.y ?? 0))),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

function toContent(formData: FormData): Json {
  const points = parsePoints(formData.get("points"));
  const shape = String(formData.get("shape") ?? "").trim();

  return {
    x: Math.max(0, Math.min(99, num(formData.get("x"), 10))),
    y: Math.max(0, Math.min(99, num(formData.get("y"), 10))),
    width: Math.max(1, Math.min(100, num(formData.get("width"), 18))),
    height: Math.max(1, Math.min(100, num(formData.get("height"), 6))),
    text: String(formData.get("text") ?? "").trim(),
    color: String(formData.get("color") ?? "#fde047").trim(),
    ...(shape ? { shape } : {}),
    ...(points ? { points } : {}),
  };
}

export async function createAnnotation(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const annotationType = String(formData.get("annotation_type") ?? "text").trim();
  const pageNumber = num(formData.get("page_number"), 1);

  if (!classroomId || !documentId || !annotationType) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  await supabase.from("annotations").insert({
    document_id: documentId,
    user_id: auth.user.id,
    annotation_type: annotationType,
    page_number: Math.max(1, pageNumber),
    content: toContent(formData),
  });

  await supabase.from("analytics_events").insert({
    classroom_id: classroomId,
    document_id: documentId,
    user_id: auth.user.id,
    event_type: "annotation_created",
    event_data: {
      annotation_type: annotationType,
      page_number: Math.max(1, pageNumber),
    } as Json,
  });

  revalidatePath(`/classrooms/${classroomId}/documents/${documentId}`);
}

export async function updateAnnotation(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const annotationId = String(formData.get("annotation_id") ?? "").trim();
  const pageNumber = num(formData.get("page_number"), 1);
  const annotationType = String(formData.get("annotation_type") ?? "text").trim();

  if (!classroomId || !documentId || !annotationId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("annotations")
    .update({
      annotation_type: annotationType,
      page_number: Math.max(1, pageNumber),
      content: toContent(formData),
    })
    .eq("id", annotationId);

  revalidatePath(`/classrooms/${classroomId}/documents/${documentId}`);
}

export async function deleteAnnotation(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const annotationId = String(formData.get("annotation_id") ?? "").trim();

  if (!classroomId || !documentId || !annotationId) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("annotations").delete().eq("id", annotationId);

  revalidatePath(`/classrooms/${classroomId}/documents/${documentId}`);
}

export async function createComment(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const mentionUserId = String(formData.get("mention_user_id") ?? "").trim();

  if (!classroomId || !documentId || !body) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  await supabase.from("comments").insert({
    document_id: documentId,
    user_id: auth.user.id,
    body,
  });

  await supabase.from("analytics_events").insert({
    classroom_id: classroomId,
    document_id: documentId,
    user_id: auth.user.id,
    event_type: "comment_created",
    event_data: {
      length: body.length,
      mentioned: Boolean(mentionUserId),
    } as Json,
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

  revalidatePath(`/classrooms/${classroomId}/documents/${documentId}`);
  revalidatePath("/classrooms");
}
