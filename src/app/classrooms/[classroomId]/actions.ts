"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ClassroomRole } from "@/lib/rbac";
import type { Json } from "@/types/database";

const VALID_ROLES: ClassroomRole[] = ["owner", "teacher", "student"];
const SOURCE_PROVIDERS = ["google_drive", "onedrive", "dropbox", "box", "url"] as const;
type SourceProvider = (typeof SOURCE_PROVIDERS)[number];

function normalizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function inferFileType(fileName: string, mimeType: string | undefined): "pdf" | "docx" | "pptx" | "image" {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  return "image";
}

async function logAuditEvent(options: {
  classroomId: string;
  actorId: string;
  eventType: "invite_sent" | "invite_accepted" | "invite_declined" | "invite_revoked" | "member_joined" | "member_left" | "member_role_updated";
  eventData?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("audit_events").insert({
    classroom_id: options.classroomId,
    actor_id: options.actorId,
    event_type: options.eventType,
    event_data: (options.eventData ?? {}) as Json,
  });
}

export async function createDocument(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const filePath = String(formData.get("file_path") ?? "").trim();
  const fileType = String(formData.get("file_type") ?? "pdf").trim() || "pdf";
  const sourceProvider = String(formData.get("source_provider") ?? "").trim();
  const sourceExternalId = String(formData.get("source_external_id") ?? "").trim();

  if (!classroomId || !title || !filePath) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const { data: document } = await supabase
    .from("documents")
    .insert({
      classroom_id: classroomId,
      owner_id: auth.user.id,
      title,
      file_path: filePath,
      file_type: fileType,
      status: "active",
    })
    .select("id")
    .single();

  if (document && sourceProvider && sourceProvider !== "none" && SOURCE_PROVIDERS.includes(sourceProvider as SourceProvider)) {
    await supabase.from("document_sources").insert({
      document_id: document.id,
      provider: sourceProvider as SourceProvider,
      source_url: filePath,
      external_id: sourceExternalId || null,
      created_by: auth.user.id,
    });
  }

  revalidatePath(`/classrooms/${classroomId}`);
}

export async function createDocumentUpload(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!classroomId || !title || !(file instanceof File) || file.size === 0) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }

  const service = createServiceClient();
  const safeName = normalizeFilename(file.name || "document");
  const storagePath = `classrooms/${classroomId}/${Date.now()}-${safeName}`;
  const fileType = inferFileType(file.name, file.type);

  const { error: uploadError } = await service.storage.from("documents").upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadError) {
    return;
  }

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      classroom_id: classroomId,
      owner_id: auth.user.id,
      title,
      file_path: storagePath,
      file_type: fileType,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !document) {
    return;
  }

  await service.from("file_storage").insert({
    classroom_id: classroomId,
    document_id: document.id,
    bucket: "documents",
    path: storagePath,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: auth.user.id,
  });

  await service.from("version_history").insert({
    document_id: document.id,
    version_number: 1,
    file_path: storagePath,
    note: "Initial upload",
    created_by: auth.user.id,
  });

  await supabase.from("analytics_events").insert({
    classroom_id: classroomId,
    document_id: document.id,
    user_id: auth.user.id,
    event_type: "document_uploaded",
    event_data: {
      file_name: file.name,
      size: file.size,
      mime_type: file.type || null,
    } as Json,
  });

  revalidatePath(`/classrooms/${classroomId}`);
}

export async function publishAssignment(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const dueAtRaw = String(formData.get("due_at") ?? "").trim();

  if (!classroomId || !documentId || !title) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .insert({
      classroom_id: classroomId,
      document_id: documentId,
      title,
      instructions: instructions || null,
      due_at: dueAtRaw || null,
      published_by: auth.user.id,
    })
    .select("id")
    .single();

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
      title: "New assignment published",
      body: title,
      reference_type: "assignment",
      reference_id: assignment?.id ?? null,
    }));

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/classrooms/${classroomId}`);
  revalidatePath("/classrooms");
}

export async function updateMemberRole(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();
  const nextRole = String(formData.get("role") ?? "").trim() as ClassroomRole;

  if (!classroomId || !memberId || !VALID_ROLES.includes(nextRole)) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const { data: requesterMembership } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!requesterMembership || requesterMembership.role !== "owner") {
    return;
  }

  const { data: targetMembership } = await supabase
    .from("classroom_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (!targetMembership) {
    return;
  }

  if (targetMembership.user_id === auth.user.id && nextRole !== "owner") {
    return;
  }

  if (targetMembership.role === "owner" && nextRole !== "owner") {
    return;
  }

  await supabase.from("classroom_members").update({ role: nextRole }).eq("id", memberId);

  await logAuditEvent({
    classroomId,
    actorId: auth.user.id,
    eventType: "member_role_updated",
    eventData: {
      member_id: memberId,
      role: nextRole,
    },
  });

  revalidatePath(`/classrooms/${classroomId}`);
}

export async function removeMember(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();

  if (!classroomId || !memberId) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const { data: requesterMembership } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!requesterMembership || requesterMembership.role !== "owner") {
    return;
  }

  const { data: targetMembership } = await supabase
    .from("classroom_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (!targetMembership || targetMembership.user_id === auth.user.id) {
    return;
  }

  await supabase.from("classroom_members").delete().eq("id", memberId);

  await logAuditEvent({
    classroomId,
    actorId: auth.user.id,
    eventType: "member_left",
    eventData: {
      member_id: memberId,
      removed_by: auth.user.id,
    },
  });

  revalidatePath(`/classrooms/${classroomId}`);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function sendInviteEmail(options: { id: string; to: string; subject: string; body: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        text: options.body,
      }),
    });

    const service = createServiceClient();

    if (!response.ok) {
      const errorText = await response.text();
      await service
        .from("email_outbox")
        .update({ status: "failed", error: errorText })
        .eq("id", options.id);
      return;
    }

    await service
      .from("email_outbox")
      .update({ status: "sent", error: null, sent_at: new Date().toISOString() })
      .eq("id", options.id);
  } catch (error) {
    const service = createServiceClient();
    await service
      .from("email_outbox")
      .update({ status: "failed", error: error instanceof Error ? error.message : "Email send failed" })
      .eq("id", options.id);
  }
}

export async function createInvite(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "student").trim() as ClassroomRole;

  if (!classroomId || !email) {
    return;
  }

  if (role !== "teacher" && role !== "student") {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  if (auth.user.email && auth.user.email.toLowerCase() === email) {
    return;
  }

  const { data: membership } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "teacher")) {
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }

  const service = createServiceClient();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("name,join_code")
    .eq("id", classroomId)
    .single();

  const { data: invite } = await service.from("classroom_invites").upsert(
    {
      classroom_id: classroomId,
      email,
      role,
      invited_by: auth.user.id,
      accepted_at: null,
      declined_at: null,
    },
    { onConflict: "classroom_id,email" },
  ).select("id").single();

  const joinCode = classroom?.join_code ?? "";
  const classroomName = classroom?.name ?? "Classroom";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const joinLink = joinCode ? `${appUrl}/classrooms?join=${joinCode}` : "";

  if (invite) {
    const { data: outbox } = await service.from("email_outbox").insert({
      classroom_id: classroomId,
      invite_id: invite.id,
      triggered_by: auth.user.id,
      to_email: email,
      subject: `You're invited to join ${classroomName}`,
      body: `You have been invited to join ${classroomName}.\n\nJoin code: ${joinCode}\nJoin link: ${joinLink || "/classrooms"}\n\nIf you already have an account, sign in and accept the invite from your classroom dashboard.`,
      metadata: {
        classroom_name: classroomName,
        join_code: joinCode,
        join_link: joinLink,
      },
    }).select("id,to_email,subject,body").single();

    if (outbox) {
      await sendInviteEmail({
        id: outbox.id,
        to: outbox.to_email,
        subject: outbox.subject,
        body: outbox.body,
      });
    }

    await logAuditEvent({
      classroomId,
      actorId: auth.user.id,
      eventType: "invite_sent",
      eventData: {
        invite_id: invite.id,
        email,
        role,
      },
    });
  }

  revalidatePath(`/classrooms/${classroomId}`);
}

export async function revokeInvite(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const inviteId = String(formData.get("invite_id") ?? "").trim();

  if (!classroomId || !inviteId) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const { data: membership } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "teacher")) {
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }

  const service = createServiceClient();
  await service.from("classroom_invites").delete().eq("id", inviteId).eq("classroom_id", classroomId);

  await logAuditEvent({
    classroomId,
    actorId: auth.user.id,
    eventType: "invite_revoked",
    eventData: {
      invite_id: inviteId,
    },
  });

  revalidatePath(`/classrooms/${classroomId}`);
}
