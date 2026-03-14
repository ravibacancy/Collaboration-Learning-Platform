"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function createIntegrationAdmin(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const externalClassId = String(formData.get("external_class_id") ?? "").trim();

  if (!classroomId || !provider) {
    return;
  }

  if (provider === "google_classroom") {
    redirect(`/api/integrations/google/start?classroomId=${classroomId}`);
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return;
  }

  const service = createServiceClient();
  const { error } = await service.from("integration_connections").insert({
    classroom_id: classroomId,
    provider,
    status: "connected",
    display_name: displayName || null,
    external_class_id: externalClassId || null,
    connected_by: auth.user.id,
  });

  if (error) {
    redirect(`/admin/integrations/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/integrations");
  redirect("/admin/integrations");
}
