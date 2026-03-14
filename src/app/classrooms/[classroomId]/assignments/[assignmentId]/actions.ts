"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const REVIEWER_ROLES = new Set(["owner", "teacher"]);
const VALID_STATUSES = new Set(["submitted", "reviewed", "returned"]);

export async function submitAssignment(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const submissionText = String(formData.get("submission_text") ?? "").trim();

  if (!classroomId || !assignmentId) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  await supabase.from("assignment_submissions").upsert(
    {
      assignment_id: assignmentId,
      student_id: auth.user.id,
      submission_text: submissionText || null,
      status: "submitted",
    },
    { onConflict: "assignment_id,student_id" },
  );

  const { data: assignment } = await supabase
    .from("assignments")
    .select("title, classroom_id")
    .eq("id", assignmentId)
    .single();

  if (assignment) {
    const { data: reviewers } = await supabase
      .from("classroom_members")
      .select("user_id")
      .eq("classroom_id", assignment.classroom_id)
      .in("role", ["owner", "teacher"]);

    const notifications = (reviewers ?? [])
      .filter((row) => row.user_id !== auth.user.id)
      .map((row) => ({
        user_id: row.user_id,
        sender_id: auth.user.id,
        type: "submission",
        title: "New assignment submission",
        body: assignment.title,
        reference_type: "assignment",
        reference_id: assignmentId,
      }));

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  revalidatePath(`/classrooms/${classroomId}/assignments/${assignmentId}`);
  revalidatePath("/classrooms");
}

export async function reviewSubmission(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!classroomId || !assignmentId || !submissionId || !VALID_STATUSES.has(status)) {
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

  if (!membership || !REVIEWER_ROLES.has(membership.role)) {
    return;
  }

  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("id, student_id, assignment_id")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.assignment_id !== assignmentId) {
    return;
  }

  await supabase.from("assignment_submissions").update({ status }).eq("id", submissionId);

  const { data: assignment } = await supabase.from("assignments").select("title").eq("id", assignmentId).single();

  if (submission.student_id !== auth.user.id) {
    await supabase.from("notifications").insert({
      user_id: submission.student_id,
      sender_id: auth.user.id,
      type: "submission",
      title: status === "reviewed" ? "Submission reviewed" : "Submission returned",
      body: assignment?.title ?? null,
      reference_type: "assignment",
      reference_id: assignmentId,
    });
  }

  revalidatePath(`/classrooms/${classroomId}/assignments/${assignmentId}`);
  revalidatePath("/classrooms");
}