import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { demoData, withDemo } from "@/lib/demo-data";

export default async function AdminOverviewPage() {
  const supabase = createServiceClient();

  const [
    classroomCountResult,
    documentCountResult,
    assignmentCountResult,
    notificationCountResult,
    integrationCountResult,
    recentClassroomsResult,
    recentDocumentsResult,
    recentAssignmentsResult,
  ] = await Promise.all([
    supabase.from("classrooms").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }),
    supabase.from("integration_connections").select("id", { count: "exact", head: true }),
    supabase.from("classrooms").select("id,name,description,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("documents").select("id,title,classroom_id,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("assignments").select("id,title,classroom_id,published_at").order("published_at", { ascending: false }).limit(5),
  ]);

  const classroomCount = classroomCountResult.count ?? 0;
  const documentCount = documentCountResult.count ?? 0;
  const assignmentCount = assignmentCountResult.count ?? 0;
  const notificationCount = notificationCountResult.count ?? 0;
  const integrationCount = integrationCountResult.count ?? 0;

  const { items: recentClassrooms } = withDemo(recentClassroomsResult.data, demoData.classrooms);
  const { items: recentDocuments, isDemo: demoDocuments } = withDemo(recentDocumentsResult.data, demoData.documents);
  const { items: recentAssignments, isDemo: demoAssignments } = withDemo(recentAssignmentsResult.data, demoData.assignments);

  const displayClassroomCount = classroomCount || recentClassrooms.length;
  const displayDocumentCount = documentCount || recentDocuments.length;
  const displayAssignmentCount = assignmentCount || recentAssignments.length;
  const displayNotificationCount = notificationCount || demoData.notifications.length;
  const displayIntegrationCount = integrationCount || demoData.integrations.length;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin Console</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
            <p className="mt-2 text-slate-600">Manage classrooms, content, and integrations from a single view.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/admin/classrooms/new">
              Add classroom
            </Link>
            <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/admin/integrations/new">
              Add LMS
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Classrooms", value: displayClassroomCount },
          { label: "Documents", value: displayDocumentCount },
          { label: "Assignments", value: displayAssignmentCount },
          { label: "Integrations", value: displayIntegrationCount },
          { label: "Notifications", value: displayNotificationCount },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recent classrooms</h2>
            <Link className="text-sm text-cyan-700" href="/admin/classrooms">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentClassrooms.length === 0 ? <p className="text-slate-500">No classrooms yet.</p> : null}
            {recentClassrooms.map((room) => (
              <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">{room.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{room.description ?? "No description"}</p>
                <p className="mt-2 text-xs text-slate-500">Created {new Date(room.created_at).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recent documents</h2>
            <Link className="text-sm text-cyan-700" href="/admin/documents">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentDocuments.length === 0 ? <p className="text-slate-500">No documents yet.</p> : null}
            {recentDocuments.map((doc) => (
              <article key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                <p className="mt-1 text-xs text-slate-500">Added {new Date(doc.created_at).toLocaleDateString()}</p>
                {!demoDocuments ? (
                  <Link className="mt-3 inline-flex text-xs text-cyan-700" href={`/classrooms/${doc.classroom_id}/documents/${doc.id}`}>
                    Open document
                  </Link>
                ) : (
                  <span className="mt-3 inline-flex text-xs text-slate-400">Demo document</span>
                )}
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recent assignments</h2>
            <Link className="text-sm text-cyan-700" href="/admin/assignments">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentAssignments.length === 0 ? <p className="text-slate-500">No assignments yet.</p> : null}
            {recentAssignments.map((assignment) => (
              <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                <p className="mt-1 text-xs text-slate-500">Published {new Date(assignment.published_at).toLocaleDateString()}</p>
                {!demoAssignments ? (
                  <Link className="mt-3 inline-flex text-xs text-cyan-700" href={`/classrooms/${assignment.classroom_id}/assignments/${assignment.id}`}>
                    Open assignment
                  </Link>
                ) : (
                  <span className="mt-3 inline-flex text-xs text-slate-400">Demo assignment</span>
                )}
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
