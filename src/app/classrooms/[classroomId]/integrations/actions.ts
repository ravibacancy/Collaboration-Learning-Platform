"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCourse, fetchCourseWork, fetchStudentSubmissions, toIsoFromGoogleDueDate } from "@/lib/google/classroom";
import { refreshAccessToken } from "@/lib/google/oauth";
import type { Json } from "@/types/database";

const PROVIDERS = ["google_classroom", "canvas", "schoology", "microsoft_teams"] as const;
type Provider = (typeof PROVIDERS)[number];
const GOOGLE_PROVIDER: Provider = "google_classroom";
const MAX_COURSEWORK_SYNC = 5;

export async function createIntegrationConnection(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const externalClassId = String(formData.get("external_class_id") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!classroomId || !provider || !PROVIDERS.includes(provider as Provider)) {
    return;
  }

  const typedProvider = provider as Provider;

  if (typedProvider === GOOGLE_PROVIDER) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  await supabase.from("integration_connections").insert({
    classroom_id: classroomId,
    provider: typedProvider,
    status: "connected",
    external_class_id: externalClassId || null,
    display_name: displayName || null,
    connected_by: auth.user.id,
  });

  revalidatePath(`/classrooms/${classroomId}/integrations`);
}

export async function updateIntegrationConnection(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const connectionId = String(formData.get("connection_id") ?? "").trim();
  const externalClassId = String(formData.get("external_class_id") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!classroomId || !connectionId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("integration_connections")
    .update({
      external_class_id: externalClassId || null,
      display_name: displayName || null,
    })
    .eq("id", connectionId)
    .eq("classroom_id", classroomId);

  revalidatePath(`/classrooms/${classroomId}/integrations`);
}

function normalizeConfig(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function updateConnectionConfig(connectionId: string, config: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("integration_connections").update({ config: config as Json }).eq("id", connectionId);
}

export async function syncGoogleClassroom(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const connectionId = String(formData.get("connection_id") ?? "").trim();

  if (!classroomId || !connectionId) {
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
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "teacher")) {
    return;
  }

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id,provider,external_class_id,config")
    .eq("id", connectionId)
    .eq("classroom_id", classroomId)
    .single();

  if (!connection || connection.provider !== GOOGLE_PROVIDER) {
    return;
  }

  const currentConfig = normalizeConfig(connection.config);

  if (!connection.external_class_id) {
    await updateConnectionConfig(connection.id, {
      ...currentConfig,
      last_error: "Set a Google Classroom course ID before syncing.",
    });
    revalidatePath(`/classrooms/${classroomId}/integrations`);
    return;
  }

  const service = createServiceClient();
  const { data: tokenRow } = await service
    .from("integration_tokens")
    .select("access_token,refresh_token,expires_at")
    .eq("connection_id", connectionId)
    .single();

  if (!tokenRow) {
    await updateConnectionConfig(connection.id, {
      ...currentConfig,
      last_error: "Missing OAuth tokens. Reconnect the integration.",
    });
    revalidatePath(`/classrooms/${classroomId}/integrations`);
    return;
  }

  let accessToken = tokenRow.access_token;
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : null;
  const shouldRefresh = expiresAt ? Date.now() > expiresAt - 60_000 : false;

  if (shouldRefresh && tokenRow.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null;
      await service.from("integration_tokens").update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt,
        scope: refreshed.scope ?? null,
        token_type: refreshed.token_type ?? null,
        refresh_token: refreshed.refresh_token ?? tokenRow.refresh_token,
      }).eq("connection_id", connectionId);
    } catch (error) {
      await updateConnectionConfig(connection.id, {
        ...currentConfig,
        last_error: error instanceof Error ? error.message : "Token refresh failed.",
      });
      revalidatePath(`/classrooms/${classroomId}/integrations`);
      return;
    }
  }

  try {
    const course = await fetchCourse(accessToken, connection.external_class_id);
    await service.from("lms_courses").upsert(
      [
        {
          connection_id: connection.id,
          classroom_id: classroomId,
          external_id: connection.external_class_id,
          name: course.name || "Untitled course",
          section: course.section || null,
          room: course.room || null,
          description: course.description || course.descriptionHeading || null,
        },
      ],
      { onConflict: "connection_id,external_id" },
    );

    const coursework = await fetchCourseWork(accessToken, connection.external_class_id);
    const trimmedCoursework = coursework.slice(0, MAX_COURSEWORK_SYNC);

    if (trimmedCoursework.length > 0) {
      await service.from("lms_coursework").upsert(
        trimmedCoursework.map((item) => ({
          connection_id: connection.id,
          classroom_id: classroomId,
          course_external_id: connection.external_class_id!,
          external_id: item.id,
          title: item.title || "Untitled coursework",
          description: item.description || null,
          state: item.state || null,
          due_at: toIsoFromGoogleDueDate(item.dueDate, item.dueTime),
          max_points: typeof item.maxPoints === "number" ? item.maxPoints : null,
          alternate_link: item.alternateLink || null,
        })),
        { onConflict: "connection_id,external_id" },
      );
    }

    let submissionsCount = 0;
    for (const item of trimmedCoursework) {
      const submissions = await fetchStudentSubmissions(accessToken, connection.external_class_id, item.id);
      submissionsCount += submissions.length;

      if (submissions.length === 0) {
        continue;
      }

      await service.from("lms_submissions").upsert(
        submissions.map((submission) => ({
          connection_id: connection.id,
          classroom_id: classroomId,
          course_external_id: connection.external_class_id!,
          coursework_external_id: item.id,
          external_id: submission.id,
          student_external_id: submission.userId || null,
          state: submission.state || null,
          assigned_grade: typeof submission.assignedGrade === "number" ? submission.assignedGrade : null,
          draft_grade: typeof submission.draftGrade === "number" ? submission.draftGrade : null,
          late: typeof submission.late === "boolean" ? submission.late : null,
          submitted_at: submission.updateTime || submission.creationTime || null,
        })),
        { onConflict: "connection_id,external_id" },
      );
    }

    await updateConnectionConfig(connection.id, {
      ...currentConfig,
      last_error: null,
      last_synced_at: new Date().toISOString(),
      last_sync_stats: {
        coursework: trimmedCoursework.length,
        submissions: submissionsCount,
      },
    });
  } catch (error) {
    await updateConnectionConfig(connection.id, {
      ...currentConfig,
      last_error: error instanceof Error ? error.message : "Sync failed.",
    });
  }

  revalidatePath(`/classrooms/${classroomId}/integrations`);
}

export async function removeIntegrationConnection(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const connectionId = String(formData.get("connection_id") ?? "").trim();

  if (!classroomId || !connectionId) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("integration_connections").delete().eq("id", connectionId);

  revalidatePath(`/classrooms/${classroomId}/integrations`);
}
