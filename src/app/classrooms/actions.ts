"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const CLASSROOM_ID_REGEX = /^[0-9a-fA-F-]{36}$/;
const JOIN_CODE_REGEX = /^[A-Za-z0-9]{8}$/;

type JoinLookup = { type: "id"; value: string } | { type: "code"; value: string };

function extractJoinLookup(input: string): JoinLookup | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  const joinMatch = trimmed.match(/[?&]join=([A-Za-z0-9]+)/);
  const joinValue = joinMatch?.[1]?.toUpperCase() ?? null;

  if (joinValue && JOIN_CODE_REGEX.test(joinValue)) {
    return { type: "code", value: joinValue };
  }

  const classroomMatch = trimmed.match(/classrooms\/([0-9a-fA-F-]{36})/);

  if (classroomMatch?.[1]) {
    return { type: "id", value: classroomMatch[1] };
  }

  if (CLASSROOM_ID_REGEX.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  if (JOIN_CODE_REGEX.test(trimmed)) {
    return { type: "code", value: trimmed.toUpperCase() };
  }

  return null;
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
    event_data: options.eventData ?? {},
  });
}

export async function createClassroom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    redirect("/classrooms?error=Classroom%20name%20is%20required");
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  try {
    const { error } = await supabase.from("classrooms").insert({
      owner_id: auth.user.id,
      name,
      description: description || null,
    });

    if (error) {
      redirect(`/classrooms?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/classrooms");
    redirect("/classrooms?message=Classroom%20created");
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/classrooms?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to create classroom")}`);
  }
}

export async function joinClassroom(formData: FormData) {
  const classroomCode = String(formData.get("classroom_code") ?? "").trim();

  if (!classroomCode) {
    return;
  }

  const lookup = extractJoinLookup(classroomCode);

  if (!lookup) {
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

  const classroomQuery = service.from("classrooms").select("id");
  const { data: classroom } =
    lookup.type === "code"
      ? await classroomQuery.eq("join_code", lookup.value).single()
      : await classroomQuery.eq("id", lookup.value).single();

  if (!classroom) {
    return;
  }

  const classroomId = classroom.id;

  const { data: existingMembership } = await service
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingMembership) {
    return;
  }

  await service.from("classroom_members").insert({
    classroom_id: classroomId,
    user_id: auth.user.id,
    role: "student",
  });

  await logAuditEvent({
    classroomId,
    actorId: auth.user.id,
    eventType: "member_joined",
    eventData: {
      method: lookup.type,
      source: lookup.type === "code" ? "join_code" : "classroom_id",
    },
  });

  revalidatePath("/classrooms");
}

export async function leaveClassroom(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();

  if (!classroomId) {
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

  if (!membership || membership.role === "owner") {
    return;
  }

  await supabase.from("classroom_members").delete().eq("classroom_id", classroomId).eq("user_id", auth.user.id);

  await logAuditEvent({
    classroomId,
    actorId: auth.user.id,
    eventType: "member_left",
  });

  revalidatePath("/classrooms");
}

export async function acceptInvite(formData: FormData) {
  const inviteId = String(formData.get("invite_id") ?? "").trim();

  if (!inviteId) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user || !auth.user.email) {
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }

  const service = createServiceClient();
  const { data: invite } = await service
    .from("classroom_invites")
    .select("id,classroom_id,email,role,invited_by,accepted_at,declined_at")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.accepted_at || invite.declined_at) {
    return;
  }

  if (invite.email.toLowerCase() !== auth.user.email.toLowerCase()) {
    return;
  }

  await service.from("classroom_members").upsert(
    {
      classroom_id: invite.classroom_id,
      user_id: auth.user.id,
      role: invite.role,
    },
    { onConflict: "classroom_id,user_id" },
  );

  await service
    .from("classroom_invites")
    .update({ accepted_at: new Date().toISOString(), declined_at: null })
    .eq("id", invite.id);

  if (invite.invited_by) {
    await service.from("notifications").insert({
      user_id: invite.invited_by,
      sender_id: auth.user.id,
      type: "invite",
      title: "Invite accepted",
      body: `${auth.user.email ?? "A user"} joined as ${invite.role}`,
      reference_type: "classroom",
      reference_id: invite.classroom_id,
    });
  }

  await logAuditEvent({
    classroomId: invite.classroom_id,
    actorId: auth.user.id,
    eventType: "invite_accepted",
    eventData: {
      invite_id: invite.id,
    },
  });

  revalidatePath("/classrooms");
}

export async function declineInvite(formData: FormData) {
  const inviteId = String(formData.get("invite_id") ?? "").trim();

  if (!inviteId) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user || !auth.user.email) {
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }

  const service = createServiceClient();
  const { data: invite } = await service
    .from("classroom_invites")
    .select("id,email,classroom_id,invited_by,accepted_at,declined_at")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.accepted_at || invite.declined_at) {
    return;
  }

  if (invite.email.toLowerCase() !== auth.user.email.toLowerCase()) {
    return;
  }

  await service.from("classroom_invites").update({ declined_at: new Date().toISOString() }).eq("id", invite.id);

  if (invite.invited_by) {
    await service.from("notifications").insert({
      user_id: invite.invited_by,
      sender_id: auth.user.id,
      type: "invite",
      title: "Invite declined",
      body: `${auth.user.email ?? "A user"} declined the invite`,
      reference_type: "classroom",
      reference_id: invite.classroom_id,
    });
  }

  await logAuditEvent({
    classroomId: invite.classroom_id,
    actorId: auth.user.id,
    eventType: "invite_declined",
    eventData: {
      invite_id: invite.id,
    },
  });

  revalidatePath("/classrooms");
}

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") ?? "").trim();

  if (!notificationId) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

  revalidatePath("/classrooms");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  await supabase.from("notifications").update({ is_read: true }).eq("user_id", auth.user.id).eq("is_read", false);

  revalidatePath("/classrooms");
}
