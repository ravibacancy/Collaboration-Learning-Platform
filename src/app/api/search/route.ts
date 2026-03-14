import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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
  const query = String(url.searchParams.get("q") ?? "").trim();
  const classroomId = url.searchParams.get("classroomId");
  const limit = parseLimit(url.searchParams.get("limit"));

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  let docsQuery = supabase
    .from("documents")
    .select("id,title,file_type,created_at,classroom_id")
    .ilike("title", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (classroomId) {
    docsQuery = docsQuery.eq("classroom_id", classroomId);
  }

  let annotationsQuery = supabase
    .from("annotations")
    .select("id,annotation_type,page_number,content,document_id,created_at")
    .ilike("content->>text", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (classroomId) {
    const { data: docIds } = await supabase.from("documents").select("id").eq("classroom_id", classroomId);
    const ids = (docIds ?? []).map((doc) => doc.id);
    if (ids.length > 0) {
      annotationsQuery = annotationsQuery.in("document_id", ids);
    } else {
      annotationsQuery = annotationsQuery.in("document_id", ["00000000-0000-0000-0000-000000000000"]);
    }
  }

  const [documentsResult, annotationsResult] = await Promise.all([docsQuery, annotationsQuery]);

  if (documentsResult.error || annotationsResult.error) {
    const message = documentsResult.error?.message ?? annotationsResult.error?.message ?? "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    documents: documentsResult.data ?? [],
    annotations: annotationsResult.data ?? [],
  });
}
