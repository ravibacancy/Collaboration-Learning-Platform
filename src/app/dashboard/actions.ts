"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createClassroomQuick(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user || !name) {
    return;
  }

  await supabase.from("classrooms").insert({
    owner_id: auth.user.id,
    name,
    description: description || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/classrooms");
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user || !name) {
    return;
  }

  await supabase.from("projects").insert({
    name,
    description: description || null,
    owner_id: auth.user.id,
    is_public: true,
    status: "Planning",
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function createTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "");
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const priorityRaw = Number(formData.get("priority") ?? "2");
  const priority = priorityRaw === 1 || priorityRaw === 3 ? priorityRaw : 2;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user || !title || !projectId) {
    return;
  }

  await supabase.from("tasks").insert({
    title,
    project_id: projectId,
    due_date: dueDateRaw || null,
    priority,
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function toggleTask(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const isDone = String(formData.get("is_done") ?? "false") === "true";
  const supabase = await createClient();

  if (!taskId) {
    return;
  }

  await supabase.from("tasks").update({ is_done: !isDone }).eq("id", taskId);
  revalidatePath("/dashboard");
  revalidatePath("/");
}
