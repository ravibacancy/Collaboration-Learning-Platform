import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createDocument, createDocumentUpload, createInvite, publishAssignment, removeMember, revokeInvite, updateMemberRole } from "./actions";
import DocumentPreview from "@/components/documents/document-preview";
import { demoData, withDemo } from "@/lib/demo-data";

type PageProps = {
  params: Promise<{ classroomId: string }>;
};

type DocumentSourceRow = {
  document_id: string;
  provider: "google_drive" | "onedrive" | "dropbox" | "box" | "url";
  source_url: string;
  external_id: string | null;
};

type FileStorageRow = {
  document_id: string | null;
  bucket: string;
  path: string;
};

const PROVIDER_LABELS: Record<DocumentSourceRow["provider"], string> = {
  google_drive: "Google Drive",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  box: "Box",
  url: "Direct URL",
};

function buildPublicUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  return `${base.replace(/\\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

function formatAuditEvent(eventType: string): string {
  switch (eventType) {
    case "invite_sent":
      return "Invite sent";
    case "invite_accepted":
      return "Invite accepted";
    case "invite_declined":
      return "Invite declined";
    case "invite_revoked":
      return "Invite revoked";
    case "member_joined":
      return "Member joined";
    case "member_left":
      return "Member left";
    case "member_role_updated":
      return "Role updated";
    default:
      return "Activity";
  }
}

export default async function ClassroomDetailPage({ params }: PageProps) {
  const { classroomId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const [{ data: classroom }, { data: documents, error }, { data: assignments, error: assignmentError }, { data: members }] =
    await Promise.all([
    supabase.from("classrooms").select("id,name,description,join_code").eq("id", classroomId).single(),
    supabase
      .from("documents")
      .select("id,title,file_type,status,created_at")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("id,title,due_at,published_at,document_id")
      .eq("classroom_id", classroomId)
      .order("published_at", { ascending: false }),
    supabase
      .from("classroom_members")
      .select("id,user_id,role,created_at")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: true }),
  ]);

  const roster = members ?? [];
  const { items: displayRoster, isDemo: demoRoster } = withDemo(roster, demoData.members);
  const { items: displayDocuments, isDemo: demoDocuments } = withDemo(documents, demoData.documents);
  const { items: displayAssignments, isDemo: demoAssignments } = withDemo(assignments, demoData.assignments);

  const viewerMembership = demoRoster
    ? { role: "owner", user_id: auth.user.id }
    : roster.find((member) => member.user_id === auth.user.id);
  const isOwner = viewerMembership?.role === "owner";
  const canShare = viewerMembership?.role === "owner" || viewerMembership?.role === "teacher";
  const joinCode = classroom?.join_code ?? "";

  const rosterUserIds = displayRoster.map((member) => member.user_id);
  const { data: profiles } = rosterUserIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", rosterUserIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? profile.id.slice(0, 8)]));

  const classroomInvites =
    canShare && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? (await createServiceClient()
          .from("classroom_invites")
          .select("id,email,role,created_at")
          .eq("classroom_id", classroomId)
          .is("accepted_at", null)
          .is("declined_at", null)
          .order("created_at", { ascending: false })).data ?? []
      : [];

  const { items: displayInvites, isDemo: demoInvites } = withDemo(classroomInvites, demoData.invites);

  const { data: auditEvents } = await supabase
    .from("audit_events")
    .select("id,event_type,event_data,created_at,actor_id")
    .eq("classroom_id", classroomId)
    .order("created_at", { ascending: false })
    .limit(8);

  const { items: displayAuditEvents } = withDemo(auditEvents, demoData.auditEvents);

  const documentIds = displayDocuments.map((doc) => doc.id);
  const { data: sources } = documentIds.length
    ? await supabase
        .from("document_sources")
        .select("document_id,provider,source_url,external_id")
        .in("document_id", documentIds)
    : { data: [] as DocumentSourceRow[] };

  const sourceMap = new Map((sources ?? []).map((source) => [source.document_id, source]));

  const { data: fileRows } = documentIds.length
    ? await supabase
        .from("file_storage")
        .select("document_id,bucket,path")
        .in("document_id", documentIds)
    : { data: [] as FileStorageRow[] };

  const fileMap = new Map((fileRows ?? []).map((row) => [row.document_id ?? "", row]));

  if (!classroom) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Classroom not found or not accessible.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Phase 2 Annotation Core</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{classroom.name}</h1>
          <p className="mt-2 text-slate-600">{classroom.description ?? "No description"}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/classrooms" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              Back to classrooms
            </Link>
            <Link
              href={`/classrooms/${classroomId}/integrations`}
              className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800"
            >
              Integrations
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Add document</h2>
            <form action={createDocumentUpload} className="mt-4 space-y-3" encType="multipart/form-data">
              <input type="hidden" name="classroom_id" value={classroomId} />
              <input name="title" required placeholder="Document title" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              <input name="file" type="file" required className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              <p className="text-xs text-slate-500">
                Upload PDFs, images, Word, or PowerPoint files. Storage bucket: <span className="font-medium">documents</span>.
              </p>
              <button type="submit" className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600">
                Upload document
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-900">Or add by link</p>
              <form action={createDocument} className="mt-3 space-y-3">
              <input type="hidden" name="classroom_id" value={classroomId} />
              <input name="title" required placeholder="Document title" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              <input
                name="file_path"
                required
                placeholder="Share URL or storage path"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <select name="source_provider" defaultValue="none" className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="none">Source: Manual upload</option>
                <option value="google_drive">Source: Google Drive</option>
                <option value="onedrive">Source: OneDrive</option>
                <option value="dropbox">Source: Dropbox</option>
                <option value="box">Source: Box</option>
                <option value="url">Source: Direct URL</option>
              </select>
              <input
                name="source_external_id"
                placeholder="External file ID (optional)"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <select name="file_type" defaultValue="pdf" className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="pptx">PPTX</option>
                <option value="image">Image</option>
              </select>
              <p className="text-xs text-slate-500">If you pick a cloud source, paste the share URL above.</p>
              <button type="submit" className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600">
                Save document
              </button>
              </form>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Publish assignment</h2>
            {assignmentError ? <p className="mt-2 text-sm text-amber-700">Run `supabase/phase3_collaboration.sql` and verify Phase 1 tables.</p> : null}
            <form action={publishAssignment} className="mt-4 space-y-3">
              <input type="hidden" name="classroom_id" value={classroomId} />
              <input name="title" required placeholder="Assignment title" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              <select
                name="document_id"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                disabled={demoDocuments}
              >
                <option value="">Select linked document</option>
                {displayDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.title}</option>
                ))}
              </select>
              <textarea name="instructions" placeholder="Instructions" className="h-24 w-full rounded-xl border border-slate-300 px-4 py-3" />
              <input type="datetime-local" name="due_at" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={demoDocuments}
              >
                Publish assignment
              </button>
            </form>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Classroom roster</h2>
                <p className="mt-1 text-sm text-slate-600">{displayRoster.length} members</p>
              </div>
              {isOwner ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Owner controls enabled</span> : null}
            </div>
            <div className="mt-4 space-y-3">
              {displayRoster.length === 0 ? <p className="text-slate-500">No members yet.</p> : null}
              {displayRoster.map((member) => {
                const name = profileMap.get(member.user_id) ?? member.user_id.slice(0, 8);
                const isSelf = member.user_id === auth.user.id;
                const canEditMember = isOwner && member.role !== "owner";

                return (
                  <article key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {name} {isSelf ? <span className="text-xs text-slate-500">(You)</span> : null}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {!demoRoster && canEditMember ? (
                        <form action={updateMemberRole} className="flex items-center gap-2">
                          <input type="hidden" name="classroom_id" value={classroomId} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                          </select>
                          <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700" type="submit">
                            Update
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">{member.role}</span>
                      )}
                      {!demoRoster && canEditMember ? (
                        <form action={removeMember}>
                          <input type="hidden" name="classroom_id" value={classroomId} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <button className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700" type="submit">
                            Remove
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Invite students</h2>
            {canShare ? (
              <>
                <p className="mt-2 text-sm text-slate-600">Share this classroom code or link with students.</p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Classroom code</p>
                  <p className="mt-2 font-mono text-sm text-slate-900">{joinCode || "Generating code..."}</p>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Join link</p>
                  <p className="mt-2 font-mono text-sm text-slate-900">
                    {joinCode ? `/classrooms?join=${joinCode}` : "Generating link..."}
                  </p>
                </div>
                <form action={createInvite} className="mt-4 space-y-3">
                  <input type="hidden" name="classroom_id" value={classroomId} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Invite by email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                  <select name="role" defaultValue="student" className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="student">Invite as student</option>
                    <option value="teacher">Invite as teacher</option>
                  </select>
                  <button className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700" type="submit">
                    Send invite
                  </button>
                </form>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending invites</p>
                  <div className="mt-3 space-y-2">
                    {displayInvites.length === 0 ? <p className="text-sm text-slate-500">No pending invites.</p> : null}
                    {displayInvites.map((invite) => (
                      <article key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{invite.email}</p>
                          <p className="text-xs text-slate-500">
                            {invite.role} · Invited {new Date(invite.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {!demoInvites ? (
                          <form action={revokeInvite}>
                            <input type="hidden" name="classroom_id" value={classroomId} />
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <button className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700" type="submit">
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">Demo invite</span>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Ask your teacher for the classroom code to join.</p>
            )}
          </article>
        </section>

        {canShare ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Audit log</h2>
                <p className="mt-1 text-sm text-slate-600">Recent membership and invite activity.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Last 8 events</span>
            </div>
            <div className="mt-4 space-y-3">
              {displayAuditEvents.length === 0 ? <p className="text-slate-500">No audit events yet.</p> : null}
              {displayAuditEvents.map((event) => {
                const data =
                  typeof event.event_data === "object" && event.event_data && !Array.isArray(event.event_data)
                    ? (event.event_data as Record<string, unknown>)
                    : {};
                const actorLabel = event.actor_id ? profileMap.get(event.actor_id) ?? event.actor_id.slice(0, 8) : "System";
                const detailParts: string[] = [];

                if (typeof data.email === "string") {
                  detailParts.push(data.email);
                }

                if (typeof data.role === "string") {
                  detailParts.push(data.role);
                }

                return (
                  <article key={event.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{formatAuditEvent(event.event_type)}</p>
                        <p className="text-xs text-slate-500">
                          {actorLabel}
                          {detailParts.length > 0 ? ` · ${detailParts.join(" · ")}` : ""}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
            {error ? <p className="mt-3 text-sm text-amber-700">Run `supabase/phase1_foundation.sql` first.</p> : null}
            <div className="mt-4 space-y-3">
              {displayDocuments.length === 0 ? <p className="text-slate-500">No documents yet.</p> : null}
              {displayDocuments.map((doc) => {
                const source = sourceMap.get(doc.id);
                const fileRow = fileMap.get(doc.id);
                const filePath = doc.file_path ?? "";
                const isDirectUrl = filePath.startsWith("http");
                const previewUrl = fileRow ? buildPublicUrl(fileRow.bucket, fileRow.path) : isDirectUrl ? filePath : "";

                return (
                  <article key={doc.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">{doc.file_type} | {doc.status}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{doc.title}</h3>
                    <div className="mt-3">
                      <DocumentPreview url={previewUrl} fileType={doc.file_type} />
                    </div>
                    {source ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Source: {PROVIDER_LABELS[source.provider]}{source.external_id ? ` · ${source.external_id}` : ""}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                        >
                          Preview file
                        </a>
                      ) : null}
                    {!demoDocuments ? (
                      <Link
                        href={`/classrooms/${classroomId}/documents/${doc.id}`}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        Open annotation viewer
                      </Link>
                    ) : (
                      <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400">
                        Demo document
                      </span>
                    )}
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
            <div className="mt-4 space-y-3">
              {displayAssignments.length === 0 ? <p className="text-slate-500">No assignments yet.</p> : null}
              {displayAssignments.map((assignment) => (
                <article key={assignment.id} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Published {new Date(assignment.published_at).toLocaleDateString()}
                    {assignment.due_at ? ` | Due ${new Date(assignment.due_at).toLocaleString()}` : ""}
                  </p>
                  <div className="mt-3">
                    {!demoAssignments ? (
                      <Link
                        href={`/classrooms/${classroomId}/assignments/${assignment.id}`}
                        className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white"
                      >
                        Open assignment
                      </Link>
                    ) : (
                      <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400">
                        Demo assignment
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
