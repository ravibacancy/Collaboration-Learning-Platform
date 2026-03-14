import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: string | null) {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function normalizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function getMembershipRole(supabase: Awaited<ReturnType<typeof createClient>>, classroomId: string, userId: string) {
  const { data } = await supabase
    .from("classroom_members")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const classroomId = url.searchParams.get("classroomId");
  const documentId = url.searchParams.get("documentId");
  const limit = parseLimit(url.searchParams.get("limit"));
  const bucket = url.searchParams.get("bucket") ?? "documents";
  const path = url.searchParams.get("path");
  const signed = url.searchParams.get("signed") === "1";

  if (path && signed) {
    const { data: fileRow } = await supabase
      .from("file_storage")
      .select("id,bucket,path,classroom_id")
      .eq("bucket", bucket)
      .eq("path", path)
      .maybeSingle();

    if (!fileRow) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Storage service not configured" }, { status: 500 });
    }

    const service = createServiceClient();
    const { data, error } = await service.storage.from(bucket).createSignedUrl(path, 60 * 60);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to create signed URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path, bucket, expiresIn: 3600 });
  }

  let query = supabase
    .from("file_storage")
    .select("id,bucket,path,file_name,mime_type,size_bytes,created_at,document_id,classroom_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (classroomId) {
    query = query.eq("classroom_id", classroomId);
  }
  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    classroomId?: string;
    fileName?: string;
    mimeType?: string;
    documentId?: string;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const classroomId = String(payload.classroomId ?? "").trim();
  const fileName = String(payload.fileName ?? "").trim();
  const mimeType = String(payload.mimeType ?? "").trim();
  const documentId = String(payload.documentId ?? "").trim();

  if (!classroomId || !fileName) {
    return NextResponse.json({ error: "classroomId and fileName are required" }, { status: 400 });
  }

  const role = await getMembershipRole(supabase, classroomId, auth.user.id);
  if (!role || (role !== "owner" && role !== "teacher")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Storage service not configured" }, { status: 500 });
  }

  const safeName = normalizeFilename(fileName);
  const storagePath = `classrooms/${classroomId}/${Date.now()}-${safeName}`;
  const service = createServiceClient();
  const { data, error } = await service.storage.from("documents").createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to create upload URL" }, { status: 500 });
  }

  if (documentId) {
    await supabase.from("file_storage").insert({
      classroom_id: classroomId,
      document_id: documentId,
      bucket: "documents",
      path: storagePath,
      file_name: fileName,
      mime_type: mimeType || null,
      created_by: auth.user.id,
    });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    path: data.path,
    bucket: "documents",
  });
}
