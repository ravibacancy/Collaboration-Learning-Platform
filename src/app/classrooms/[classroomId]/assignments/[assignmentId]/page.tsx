import Link from "next/link";
import { redirect } from "next/navigation";
import RealtimeRefresh from "@/components/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { reviewSubmission, submitAssignment } from "./actions";
import { demoData, withDemo } from "@/lib/demo-data";

type PageProps = {
  params: Promise<{ classroomId: string; assignmentId: string }>;
};

type SubmissionStatus = "submitted" | "reviewed" | "returned";

type SubmissionStats = {
  total: number;
  submitted: number;
  reviewed: number;
  returned: number;
};

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  submitted: "border-cyan-200 bg-cyan-50 text-cyan-700",
  reviewed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  returned: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function AssignmentPage({ params }: PageProps) {
  const { classroomId, assignmentId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const [{ data: assignment }, { data: membership }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id,title,instructions,due_at,published_at,document_id")
      .eq("id", assignmentId)
      .eq("classroom_id", classroomId)
      .single(),
    supabase
      .from("classroom_members")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", auth.user.id)
      .single(),
  ]);

  if (!assignment || !membership) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Assignment not found or inaccessible.</p>
      </main>
    );
  }

  const isTeacherView = membership.role === "owner" || membership.role === "teacher";

  const { data: submissions, error: submissionError } = isTeacherView
    ? await supabase
        .from("assignment_submissions")
        .select("id,student_id,submission_text,status,submitted_at")
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: false })
    : await supabase
        .from("assignment_submissions")
        .select("id,student_id,submission_text,status,submitted_at")
        .eq("assignment_id", assignmentId)
        .eq("student_id", auth.user.id)
        .order("submitted_at", { ascending: false });

  const { items: displaySubmissions, isDemo: demoSubmissions } = withDemo(submissions, demoData.submissions);
  const userIds = [...new Set(displaySubmissions.map((item) => item.student_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", userIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? profile.id.slice(0, 8)]));

  const submissionStats = displaySubmissions.reduce<SubmissionStats>(
    (acc, submission) => {
      acc.total += 1;
      if (submission.status === "reviewed") {
        acc.reviewed += 1;
      } else if (submission.status === "returned") {
        acc.returned += 1;
      } else {
        acc.submitted += 1;
      }
      return acc;
    },
    { total: 0, submitted: 0, reviewed: 0, returned: 0 },
  );

  const hasSubmission = displaySubmissions.length > 0;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
      <RealtimeRefresh
        channel={`assignment-submissions-${assignmentId}`}
        table="assignment_submissions"
        filter={`assignment_id=eq.${assignmentId}`}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Phase 3 Assignment Workflow</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{assignment.title}</h1>
          <p className="mt-2 text-slate-600">{assignment.instructions ?? "No instructions"}</p>
          <p className="mt-2 text-sm text-slate-500">
            Published {new Date(assignment.published_at).toLocaleDateString()}
            {assignment.due_at ? ` | Due ${new Date(assignment.due_at).toLocaleString()}` : ""}
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href={`/classrooms/${classroomId}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700">
              Back to classroom
            </Link>
            <Link href={`/classrooms/${classroomId}/documents/${assignment.document_id}`} className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white">
              Open linked document
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          {!isTeacherView ? (
            <article className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Submit work</h2>
              <form action={submitAssignment} className="mt-4 space-y-3">
                <input type="hidden" name="classroom_id" value={classroomId} />
                <input type="hidden" name="assignment_id" value={assignmentId} />
                <textarea
                  name="submission_text"
                  required
                  placeholder="Add your answer / submission notes"
                  className="h-40 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
                <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600" type="submit">
                  {hasSubmission ? "Update submission" : "Submit assignment"}
                </button>
              </form>
            </article>
          ) : null}

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Submissions</h2>
            {isTeacherView ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Total {submissionStats.total}</span>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700">Submitted {submissionStats.submitted}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Reviewed {submissionStats.reviewed}</span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Returned {submissionStats.returned}</span>
              </div>
            ) : null}
            {submissionError ? <p className="mt-2 text-sm text-amber-700">Run `supabase/phase3_collaboration.sql` to enable submissions.</p> : null}
            <div className="mt-4 space-y-3">
              {displaySubmissions.length === 0 ? <p className="text-slate-500">No submissions yet.</p> : null}
              {displaySubmissions.map((submission) => {
                const status = submission.status as SubmissionStatus;
                const statusStyle = STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-700";
                const isReviewed = submission.status === "reviewed";
                const isReturned = submission.status === "returned";

                return (
                  <article key={submission.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.2em] ${statusStyle}`}>
                        {submission.status}
                      </p>
                      <p className="text-xs text-slate-500">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">
                      {profileMap.get(submission.student_id) ?? submission.student_id.slice(0, 8)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{submission.submission_text ?? "(empty)"}</p>
                    {isTeacherView && !demoSubmissions ? (
                      <form action={reviewSubmission} className="mt-3 flex flex-wrap gap-2 text-xs">
                        <input type="hidden" name="classroom_id" value={classroomId} />
                        <input type="hidden" name="assignment_id" value={assignmentId} />
                        <input type="hidden" name="submission_id" value={submission.id} />
                        <button
                          className={`rounded-lg border border-emerald-200 px-3 py-1 text-emerald-700 ${isReviewed ? "cursor-not-allowed opacity-50" : "hover:bg-emerald-50"}`}
                          type="submit"
                          name="status"
                          value="reviewed"
                          disabled={isReviewed}
                        >
                          Mark reviewed
                        </button>
                        <button
                          className={`rounded-lg border border-rose-200 px-3 py-1 text-rose-700 ${isReturned ? "cursor-not-allowed opacity-50" : "hover:bg-rose-50"}`}
                          type="submit"
                          name="status"
                          value="returned"
                          disabled={isReturned}
                        >
                          Return
                        </button>
                      </form>
                    ) : isTeacherView ? (
                      <p className="mt-3 text-xs text-slate-400">Demo submissions</p>
                    ) : null}
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
