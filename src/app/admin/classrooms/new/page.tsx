import Link from "next/link";
import { createClassroomAdmin } from "../actions";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminNewClassroomPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Add Classroom</h1>
        <p className="mt-2 text-slate-600">Create a new classroom space for students and teachers.</p>
        <div className="mt-4">
          <Link className="text-sm text-cyan-700" href="/admin/classrooms">
            Back to classrooms
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        {params.error ? (
          <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {params.error}
          </p>
        ) : null}
        <form action={createClassroomAdmin} className="space-y-4">
          <input
            name="name"
            required
            placeholder="Classroom name"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="description"
            placeholder="Description"
            className="h-28 w-full rounded-xl border border-slate-300 px-4 py-3"
          />
          <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Create classroom
          </button>
        </form>
      </section>
    </main>
  );
}
