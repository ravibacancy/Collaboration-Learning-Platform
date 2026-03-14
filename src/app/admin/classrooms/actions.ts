"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function createClassroomAdmin(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const { data: classroom, error } = await supabase
    .from("classrooms")
    .insert({
      owner_id: auth.user.id,
      name,
      description: description || null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/admin/classrooms/new?error=${encodeURIComponent(error.message)}`);
  }

  if (classroom) {
    const service = createServiceClient();
    await service.from("classroom_members").upsert(
      {
        classroom_id: classroom.id,
        user_id: auth.user.id,
        role: "owner",
      },
      { onConflict: "classroom_id,user_id" },
    );
  }

  revalidatePath("/admin/classrooms");
  revalidatePath("/classrooms");
  redirect("/admin/classrooms");
}
