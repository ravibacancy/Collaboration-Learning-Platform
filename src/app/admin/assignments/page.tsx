import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { demoData, withDemo } from "@/lib/demo-data";

type ClassroomRow = { id: string; name: string };

export default async function AdminAssignmentsPage() {
  const supabase = createServiceClient();

  const [assignmentsResult, classroomsResult] = await Promise.all([
    supabase.from("assignments").select("id,title,due_at,published_at,classroom_id").order("published_at", { ascending: false }),
    supabase.from("classrooms").select("id,name"),
  ]);

  const { items: assignments, isDemo: demoAssignments } = withDemo(assignmentsResult.data, demoData.assignments);
  const classrooms = classroomsResult.data ?? demoData.classrooms;
  const classroomMap = new Map((classrooms as ClassroomRow[]).map((room) => [room.id, room.name]));

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Assignments</h1>
        <p className="mt-2 text-slate-600">Monitor published assignments across classrooms.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Classroom</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assignments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>No assignments yet.</td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{assignment.title}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{classroomMap.get(assignment.classroom_id) ?? "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(assignment.published_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-slate-600">{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-4">
                      {!demoAssignments ? (
                        <Link className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700" href={`/classrooms/${assignment.classroom_id}/assignments/${assignment.id}`}>
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
