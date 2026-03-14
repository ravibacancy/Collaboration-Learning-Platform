import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { demoData, withDemo } from "@/lib/demo-data";

type ClassroomRow = { id: string; name: string };

export default async function AdminDocumentsPage() {
  const supabase = createServiceClient();

  const [documentsResult, classroomsResult] = await Promise.all([
    supabase.from("documents").select("id,title,file_type,status,created_at,classroom_id,owner_id").order("created_at", { ascending: false }),
    supabase.from("classrooms").select("id,name"),
  ]);

  const { items: documents, isDemo: demoDocuments } = withDemo(documentsResult.data, demoData.documents);
  const classrooms = classroomsResult.data ?? demoData.classrooms;
  const classroomMap = new Map((classrooms as ClassroomRow[]).map((room) => [room.id, room.name]));

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Documents</h1>
        <p className="mt-2 text-slate-600">Track documents across classrooms and open them for annotation.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Classroom</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>No documents yet.</td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{classroomMap.get(doc.classroom_id) ?? "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-600">{doc.file_type}</td>
                    <td className="px-4 py-4 text-slate-600">{doc.status}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      {!demoDocuments ? (
                        <Link className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700" href={`/classrooms/${doc.classroom_id}/documents/${doc.id}`}>
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
