import Link from "next/link";
import { redirect } from "next/navigation";
import RealtimeRefresh from "@/components/realtime-refresh";
import AnalyticsTracker from "@/components/analytics/analytics-tracker";
import { createClient } from "@/lib/supabase/server";
import PdfAnnotationStudio from "@/components/annotations/pdf-annotation-studio";
import { createAnnotation, createComment, deleteAnnotation, updateAnnotation } from "./actions";
import { demoData, withDemo } from "@/lib/demo-data";

type PageProps = {
  params: Promise<{ classroomId: string; documentId: string }>;
};

type AnnotationStudioItem = {
  id: string;
  annotation_type: string;
  page_number: number;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: string;
  points?: Array<{ x: number; y: number }>;
};

type AnnotationHistoryItem = {
  id: string;
  annotation_id: string | null;
  actor_id: string | null;
  action: "created" | "updated" | "deleted";
  annotation_type: string;
  page_number: number;
  text: string;
  color: string;
  captured_at: string;
};

function toNumber(input: unknown, fallback: number) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function formatAction(action: AnnotationHistoryItem["action"]) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function buildPublicUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmedBase}/storage/v1/object/public/${bucket}/${path}`;
}

export default async function DocumentViewerPage({ params }: PageProps) {
  const { classroomId, documentId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const [
    { data: document },
    { data: annotations },
    { data: comments },
    { data: members },
    { data: history, error: historyError },
    { data: fileRow },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id,title,file_path,file_type,status,classroom_id")
      .eq("id", documentId)
      .eq("classroom_id", classroomId)
      .single(),
    supabase
      .from("annotations")
      .select("id,annotation_type,page_number,content,user_id,created_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("comments")
      .select("id,body,user_id,created_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("classroom_members")
      .select("user_id,role")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: true }),
    supabase
      .from("annotation_versions")
      .select("id,annotation_id,actor_id,action,annotation_type,page_number,content,captured_at")
      .eq("document_id", documentId)
      .order("captured_at", { ascending: false })
      .limit(30),
    supabase
      .from("file_storage")
      .select("bucket,path")
      .eq("document_id", documentId)
      .maybeSingle(),
  ]);

  if (!document) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Document not found.</p>
      </main>
    );
  }

  const safeAnnotations: AnnotationStudioItem[] = (annotations ?? []).map((annotation) => {
    const content = typeof annotation.content === "object" && annotation.content && !Array.isArray(annotation.content) ? annotation.content : {};
    const rawPoints = (content as Record<string, unknown>).points;
    const points = Array.isArray(rawPoints)
      ? rawPoints
          .map((point) => ({
            x: toNumber((point as Record<string, unknown>)?.x, 0),
            y: toNumber((point as Record<string, unknown>)?.y, 0),
          }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      : undefined;

    return {
      id: annotation.id,
      annotation_type: annotation.annotation_type,
      page_number: annotation.page_number,
      text: typeof content.text === "string" ? content.text : "",
      color: typeof content.color === "string" ? content.color : "#fde047",
      x: toNumber((content as Record<string, unknown>).x, 10),
      y: toNumber((content as Record<string, unknown>).y, 10),
      width: toNumber((content as Record<string, unknown>).width, 18),
      height: toNumber((content as Record<string, unknown>).height, 6),
      shape: typeof content.shape === "string" ? content.shape : undefined,
      points,
    };
  });

  const demoAnnotations: AnnotationStudioItem[] = demoData.annotations.map((annotation) => ({
    id: annotation.id,
    annotation_type: annotation.annotation_type,
    page_number: annotation.page_number,
    text: typeof annotation.content.text === "string" ? annotation.content.text : "",
    color: typeof annotation.content.color === "string" ? annotation.content.color : "#fde047",
    x: toNumber(annotation.content.x, 10),
    y: toNumber(annotation.content.y, 10),
    width: toNumber(annotation.content.width, 18),
    height: toNumber(annotation.content.height, 6),
  }));

  const { items: displayAnnotations } = withDemo(safeAnnotations, demoAnnotations);

  const safeHistory: AnnotationHistoryItem[] = (history ?? []).map((entry) => {
    const content = typeof entry.content === "object" && entry.content && !Array.isArray(entry.content) ? entry.content : {};

    return {
      id: entry.id,
      annotation_id: entry.annotation_id,
      actor_id: entry.actor_id,
      action: entry.action,
      annotation_type: entry.annotation_type,
      page_number: entry.page_number,
      text: typeof content.text === "string" ? content.text : "",
      color: typeof content.color === "string" ? content.color : "#94a3b8",
      captured_at: entry.captured_at,
    };
  });

  const demoHistory: AnnotationHistoryItem[] = demoData.annotationHistory.map((entry) => ({
    id: entry.id,
    annotation_id: entry.annotation_id,
    actor_id: entry.actor_id,
    action: entry.action,
    annotation_type: entry.annotation_type,
    page_number: entry.page_number,
    text: typeof entry.content.text === "string" ? entry.content.text : "",
    color: typeof entry.content.color === "string" ? entry.content.color : "#94a3b8",
    captured_at: entry.captured_at,
  }));

  const { items: displayHistory } = withDemo(safeHistory, demoHistory);

  const displayComments = withDemo(comments, demoData.comments).items;
  const profileIds = [
    ...new Set([
      ...displayComments.map((comment) => comment.user_id),
      ...(members ?? []).map((member) => member.user_id),
      ...displayHistory.map((entry) => entry.actor_id).filter((value): value is string => Boolean(value)),
    ]),
  ];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", profileIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? profile.id.slice(0, 8)]));

  const isDirectUrl = document.file_path.startsWith("http");
  const resolvedFilePath = fileRow ? buildPublicUrl(fileRow.bucket, fileRow.path) : isDirectUrl ? document.file_path : document.file_path;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
      <RealtimeRefresh channel={`document-comments-${documentId}`} table="comments" filter={`document_id=eq.${documentId}`} />
      <AnalyticsTracker
        eventType="document_viewed"
        classroomId={classroomId}
        documentId={documentId}
        eventData={{ file_type: document.file_type }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Phase 2 Annotation Core + Phase 3 Collaboration</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{document.title}</h1>
          <p className="mt-2 text-slate-600">PDF page rendering with live collaboration presence, comments, and persisted annotation editing.</p>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href={`/classrooms/${classroomId}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700">
              Back to classroom
            </Link>
          </div>
        </header>

        {document.file_type === "pdf" ? (
          <PdfAnnotationStudio
            classroomId={classroomId}
            documentId={documentId}
            filePath={resolvedFilePath}
            title={document.title}
            annotations={displayAnnotations}
            currentUser={{ id: auth.user.id, email: auth.user.email ?? undefined }}
            createAction={createAnnotation}
            updateAction={updateAnnotation}
            deleteAction={deleteAnnotation}
          />
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Preview only</h2>
            <p className="mt-2 text-sm text-slate-600">
              Annotation tools are currently available for PDFs only. Open the file to view.
            </p>
            <div className="mt-4">
              <a
                href={resolvedFilePath}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Open file
              </a>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Comments and Mentions</h2>
          <form action={createComment} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input type="hidden" name="classroom_id" value={classroomId} />
            <input type="hidden" name="document_id" value={documentId} />
            <textarea name="body" required placeholder="Add a threaded comment" className="h-24 rounded-xl border border-slate-300 px-4 py-3" />
            <select name="mention_user_id" defaultValue="" className="rounded-xl border border-slate-300 px-4 py-3">
              <option value="">Mention (optional)</option>
              {(members ?? []).map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {profileMap.get(member.user_id) ?? member.user_id.slice(0, 8)} ({member.role})
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600" type="submit">
              Post comment
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {displayComments.length === 0 ? <p className="text-slate-500">No comments yet.</p> : null}
            {displayComments.map((comment) => (
              <article key={comment.id} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">{profileMap.get(comment.user_id) ?? comment.user_id.slice(0, 8)}</h3>
                <p className="mt-1 text-sm text-slate-600">{comment.body}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(comment.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Version history</h2>
          {historyError ? <p className="mt-2 text-sm text-amber-700">Run `supabase/phase4_reliability.sql` to enable annotation history.</p> : null}
          <div className="mt-4 space-y-3">
            {displayHistory.length === 0 && !historyError ? <p className="text-slate-500">No history yet.</p> : null}
            {displayHistory.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-semibold text-slate-900">
                      {formatAction(entry.action)} {entry.annotation_type} on page {entry.page_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{new Date(entry.captured_at).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {profileMap.get(entry.actor_id ?? "") ?? entry.actor_id?.slice(0, 8) ?? "System"} · Annotation {entry.annotation_id?.slice(0, 8) ?? "unknown"}
                </p>
                {entry.text ? <p className="mt-2 text-sm text-slate-700">"{entry.text}"</p> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
