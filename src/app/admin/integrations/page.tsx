import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { demoData, withDemo } from "@/lib/demo-data";

type ClassroomRow = { id: string; name: string };

const PROVIDER_LABELS: Record<string, string> = {
  google_classroom: "Google Classroom",
  canvas: "Canvas",
  schoology: "Schoology",
  microsoft_teams: "Microsoft Teams",
};

export default async function AdminIntegrationsPage() {
  const supabase = createServiceClient();

  const [connectionsResult, classroomsResult] = await Promise.all([
    supabase
      .from("integration_connections")
      .select("id,provider,status,display_name,external_class_id,created_at,classroom_id")
      .order("created_at", { ascending: false }),
    supabase.from("classrooms").select("id,name"),
  ]);

  const { items: connections, isDemo: demoConnections } = withDemo(connectionsResult.data, demoData.integrations);
  const classrooms = classroomsResult.data ?? demoData.classrooms;
  const classroomMap = new Map((classrooms as ClassroomRow[]).map((room) => [room.id, room.name]));

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Integrations</h1>
            <p className="mt-2 text-slate-600">Monitor connected LMS providers and jump into sync workflows.</p>
          </div>
          <Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/admin/integrations/new">
            Add LMS
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Classroom</th>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">Class ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {connections.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>No integrations yet.</td>
                </tr>
              ) : (
                connections.map((connection) => (
                  <tr key={connection.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-900">{PROVIDER_LABELS[connection.provider] ?? connection.provider}</td>
                    <td className="px-4 py-4 text-slate-600">{classroomMap.get(connection.classroom_id) ?? "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-600">{connection.display_name ?? "LMS connection"}</td>
                    <td className="px-4 py-4 text-slate-600">{connection.external_class_id ?? "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{connection.status}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(connection.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      {!demoConnections ? (
                        <Link className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700" href={`/classrooms/${connection.classroom_id}/integrations`}>
                          Manage
                        </Link>
                      ) : (
                        <span className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-400">Demo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
