import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoData, withDemo } from "@/lib/demo-data";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

type CommentResult = {
  id: string;
  body: string;
  document_id: string;
  created_at: string;
  documents?: { title: string | null; classroom_id: string | null } | null;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = String(params.q ?? "").trim();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  if (!query) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Search</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Find anything in your classrooms</h1>
            <p className="mt-2 text-slate-600">Search across classrooms, documents, assignments, and comments.</p>
            <form action="/search" className="mt-4 flex flex-wrap gap-3">
              <input
                name="q"
                placeholder="Try 'biology' or 'chapter 2'"
                className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-4 py-3"
              />
              <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white">Search</button>
            </form>
          </header>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-slate-600">Enter a search term to start.</p>
            <Link href="/classrooms" className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">
              Back to classrooms
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const like = `%${query}%`;

  const [classroomsResult, documentsResult, assignmentsResult, commentsResult] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id,name,description,created_at")
      .or(`name.ilike.${like},description.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("documents")
      .select("id,title,classroom_id,created_at")
      .ilike("title", like)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("assignments")
      .select("id,title,instructions,classroom_id,published_at")
      .or(`title.ilike.${like},instructions.ilike.${like}`)
      .order("published_at", { ascending: false })
      .limit(8),
    supabase
      .from("comments")
      .select("id,body,document_id,created_at,documents(title,classroom_id)")
      .ilike("body", like)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const classrooms = classroomsResult.data ?? [];
  const documents = documentsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const comments = (commentsResult.data ?? []) as CommentResult[];

  const demoComments = demoData.comments.map((comment) => {
    const doc = demoData.documents.find((item) => item.id === comment.document_id) ?? demoData.documents[0];
    return {
      ...comment,
      documents: { title: doc?.title ?? "Document", classroom_id: doc?.classroom_id ?? null },
    } as CommentResult;
  });

  const { items: displayClassrooms, isDemo: demoClassrooms } = withDemo(classrooms, demoData.classrooms);
  const { items: displayDocuments, isDemo: demoDocuments } = withDemo(documents, demoData.documents);
  const { items: displayAssignments, isDemo: demoAssignments } = withDemo(assignments, demoData.assignments);
  const { items: displayComments, isDemo: demoCommentsMode } = withDemo(comments, demoComments);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Search Results</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Results for "{query}"</h1>
          <form action="/search" className="mt-4 flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={query}
              className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-4 py-3"
            />
            <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white">Search</button>
          </form>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Classrooms</h2>
            {displayClassrooms.length === 0 ? <p className="mt-3 text-slate-500">No classroom matches.</p> : null}
            <div className="mt-4 space-y-3">
              {displayClassrooms.map((room) => (
                <article key={room.id} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{room.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{room.description ?? "No description"}</p>
                  <div className="mt-3">
                    {!demoClassrooms ? (
                      <Link href={`/classrooms/${room.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                        Open classroom
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Demo classroom</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
            {displayDocuments.length === 0 ? <p className="mt-3 text-slate-500">No document matches.</p> : null}
            <div className="mt-4 space-y-3">
              {displayDocuments.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">Updated {new Date(doc.created_at).toLocaleDateString()}</p>
                  <div className="mt-3">
                    {!demoDocuments ? (
                      <Link
                        href={`/classrooms/${doc.classroom_id}/documents/${doc.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
                      >
                        Open document
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Demo document</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
            {displayAssignments.length === 0 ? <p className="mt-3 text-slate-500">No assignment matches.</p> : null}
            <div className="mt-4 space-y-3">
              {displayAssignments.map((assignment) => (
                <article key={assignment.id} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{assignment.instructions ?? "No instructions"}</p>
                  <div className="mt-3">
                    {!demoAssignments ? (
                      <Link
                        href={`/classrooms/${assignment.classroom_id}/assignments/${assignment.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
                      >
                        Open assignment
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Demo assignment</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Comments</h2>
            {displayComments.length === 0 ? <p className="mt-3 text-slate-500">No comment matches.</p> : null}
            <div className="mt-4 space-y-3">
              {displayComments.map((comment) => {
                const document = comment.documents;
                const classroomId = document?.classroom_id;
                const docTitle = document?.title ?? "Document";
                const link = classroomId ? `/classrooms/${classroomId}/documents/${comment.document_id}` : null;

                return (
                  <article key={comment.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">{comment.body}</p>
                    <p className="mt-2 text-xs text-slate-500">On {docTitle}</p>
                    <div className="mt-3">
                      {link && !demoCommentsMode ? (
                        <Link href={link} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                          Open document
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">No link available</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

