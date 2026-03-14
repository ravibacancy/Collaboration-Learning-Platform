import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { createIntegrationAdmin } from "../actions";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminNewIntegrationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();
  const { data: classrooms } = await supabase.from("classrooms").select("id,name").order("created_at", { ascending: false });

  const safeClassrooms = classrooms ?? [];

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Add LMS Integration</h1>
        <p className="mt-2 text-slate-600">Connect a classroom to Google Classroom or add a manual LMS entry.</p>
        <div className="mt-4">
          <Link className="text-sm text-cyan-700" href="/admin/integrations">
            Back to integrations
          </Link>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-900">Google Classroom</h2>
          <p className="mt-2 text-sm text-slate-600">Start OAuth to connect Google Classroom for coursework sync.</p>
          <div className="mt-4 space-y-3">
            {safeClassrooms.length === 0 ? (
              <p className="text-slate-500">Create a classroom first.</p>
            ) : (
              safeClassrooms.map((room) => (
                <div key={room.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{room.name}</p>
                    <p className="text-xs text-slate-500">Classroom ID {room.id.slice(0, 8)}</p>
                  </div>
                  <Link
                    className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
                    href={`/api/integrations/google/start?classroomId=${room.id}`}
                  >
                    Connect Google Classroom
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-900">Manual LMS</h2>
          <p className="mt-2 text-sm text-slate-600">Use this to log non-OAuth LMS connections.</p>
          {params.error ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {params.error}
            </p>
          ) : null}
          <form action={createIntegrationAdmin} className="mt-4 space-y-3">
            <select name="classroom_id" required className="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="">Select classroom</option>
              {safeClassrooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <select name="provider" required className="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="">Select provider</option>
              <option value="canvas">Canvas</option>
              <option value="schoology">Schoology</option>
              <option value="microsoft_teams">Microsoft Teams</option>
            </select>
            <input
              name="display_name"
              placeholder="Display name (optional)"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
            <input
              name="external_class_id"
              placeholder="External class ID (optional)"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Create integration
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
