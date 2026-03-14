import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { demoData, withDemo } from "@/lib/demo-data";

type CountMap = Map<string, number>;

function buildCountMap(rows: Array<{ classroom_id: string }> | null): CountMap {
  const map = new Map<string, number>();
  (rows ?? []).forEach((row) => {
    map.set(row.classroom_id, (map.get(row.classroom_id) ?? 0) + 1);
  });
  return map;
}

export default async function AdminClassroomsPage() {
  const supabase = createServiceClient();

  const [
    classroomsResult,
    documentsResult,
    assignmentsResult,
    membersResult,
  ] = await Promise.all([
    supabase.from("classrooms").select("id,name,description,created_at,owner_id").order("created_at", { ascending: false }),
    supabase.from("documents").select("id,classroom_id"),
    supabase.from("assignments").select("id,classroom_id"),
    supabase.from("classroom_members").select("id,classroom_id"),
  ]);

  const { items: classrooms, isDemo: demoClassrooms } = withDemo(classroomsResult.data, demoData.classrooms);
  const documentCounts = demoClassrooms ? buildCountMap(demoData.documents.map((doc) => ({ classroom_id: doc.classroom_id }))) : buildCountMap(documentsResult.data);
  const assignmentCounts = demoClassrooms ? buildCountMap(demoData.assignments.map((assignment) => ({ classroom_id: assignment.classroom_id }))) : buildCountMap(assignmentsResult.data);
  const memberCounts = demoClassrooms
    ? buildCountMap(
        demoData.members.map((member, index) => ({
          classroom_id: demoData.classrooms[index % demoData.classrooms.length]?.id ?? "",
        })),
      )
    : buildCountMap(membersResult.data);

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Classrooms</h1>
            <p className="mt-2 text-slate-600">Manage classroom spaces and track related activity.</p>
          </div>
          <Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/admin/classrooms/new">
            Add classroom
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Classroom</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Assignments</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {classrooms.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>No classrooms yet.</td>
                </tr>
              ) : (
                classrooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{room.name}</p>
                      <p className="text-xs text-slate-500">{room.description ?? "No description"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{memberCounts.get(room.id) ?? 0}</td>
                    <td className="px-4 py-4 text-slate-600">{documentCounts.get(room.id) ?? 0}</td>
                    <td className="px-4 py-4 text-slate-600">{assignmentCounts.get(room.id) ?? 0}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(room.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      {!demoClassrooms ? (
                        <Link className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700" href={`/classrooms/${room.id}`}>
                          Open
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
