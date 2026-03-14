import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClassroomQuick, createProject, createTask, toggleTask } from "./actions";
import { signOut } from "@/app/auth/actions";
import { demoData, withDemo } from "@/lib/demo-data";

const PROVIDER_LABELS: Record<string, string> = {
  google_classroom: "Google Classroom",
  canvas: "Canvas",
  schoology: "Schoology",
  microsoft_teams: "Microsoft Teams",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const [
    projectsResult,
    tasksResult,
    classroomsResult,
    documentsResult,
    assignmentsResult,
    notificationsResult,
    connectionsResult,
    classroomCountResult,
    documentCountResult,
    assignmentCountResult,
    notificationCountResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,description,created_at")
      .eq("owner_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tasks")
      .select("id,title,is_done,priority,due_date,project_id,projects(name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("classrooms")
      .select("id,name,description,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("documents")
      .select("id,title,created_at,classroom_id")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("assignments")
      .select("id,title,due_at,published_at,classroom_id")
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("notifications")
      .select("id,type,title,body,is_read,created_at,reference_id,reference_type")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("integration_connections")
      .select("id,provider,status,display_name,external_class_id,created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("classrooms").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
  ]);

  const safeProjects = projectsResult.data ?? [];
  const safeTasks = tasksResult.data ?? [];
  const safeClassrooms = classroomsResult.data ?? [];
  const safeDocuments = documentsResult.data ?? [];
  const safeAssignments = assignmentsResult.data ?? [];
  const safeNotifications = notificationsResult.data ?? [];
  const safeConnections = connectionsResult.data ?? [];

  const { items: displayProjects, isDemo: demoProjects } = withDemo(safeProjects, demoData.projects);
  const { items: displayTasks, isDemo: demoTasks } = withDemo(safeTasks, demoData.tasks);
  const { items: displayClassrooms, isDemo: demoClassrooms } = withDemo(safeClassrooms, demoData.classrooms);
  const { items: displayDocuments, isDemo: demoDocuments } = withDemo(safeDocuments, demoData.documents);
  const { items: displayAssignments, isDemo: demoAssignments } = withDemo(safeAssignments, demoData.assignments);
  const { items: displayNotifications } = withDemo(safeNotifications, demoData.notifications);
  const { items: displayConnections } = withDemo(safeConnections, demoData.integrations);

  const classroomCount = (classroomCountResult.count ?? 0) || displayClassrooms.length;
  const documentCount = (documentCountResult.count ?? 0) || displayDocuments.length;
  const assignmentCount = (assignmentCountResult.count ?? 0) || displayAssignments.length;
  const notificationCount = (notificationCountResult.count ?? 0) || displayNotifications.length;
  const openTasks = displayTasks.filter((task) => !task.is_done).length;

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-8 h-64 w-64 rounded-full bg-cyan-200/60 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-amber-200/60 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-start">
        <aside className="w-full rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur lg:sticky lg:top-6 lg:w-[260px]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              K
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">BACANCY</p>
              <p className="text-lg font-semibold text-slate-900">Workspace Hub</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2 text-sm">
            <Link className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white" href="/dashboard">
              Overview
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">Live</span>
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-slate-700" href="/classrooms">
              Classrooms
              <span className="text-xs text-slate-500">{classroomCount}</span>
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-slate-700" href="/search">
              Search
              <span className="text-xs text-slate-500">Global</span>
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-slate-700" href="/classrooms">
              Integrations
              <span className="text-xs text-slate-500">{displayConnections.length}</span>
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-slate-700" href="/classrooms">
              Notifications
              <span className="text-xs text-slate-500">{notificationCount}</span>
            </Link>
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Account</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{auth.user.email}</p>
            <form action={signOut} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex-1 space-y-6">
          <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Control Center</p>
            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
                <p className="mt-2 text-slate-600">Everything you need to manage classrooms, assignments, and tasks.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/classrooms">
                  Open classrooms
                </Link>
                <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/search">
                  Global search
                </Link>
              </div>
            </div>
            <form action="/search" className="mt-5 flex flex-wrap gap-3">
              <input
                name="q"
                placeholder="Search classrooms, documents, assignments..."
                className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
              <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600" type="submit">
                Search
              </button>
            </form>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Classrooms", value: classroomCount, hint: "Active spaces", tone: "bg-cyan-50 text-cyan-700" },
              { label: "Documents", value: documentCount, hint: "Files linked", tone: "bg-amber-50 text-amber-700" },
              { label: "Assignments", value: assignmentCount, hint: "Published", tone: "bg-emerald-50 text-emerald-700" },
              { label: "Open tasks", value: openTasks, hint: "Project work", tone: "bg-slate-100 text-slate-700" },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs ${item.tone}`}>{item.hint}</span>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <form action={createClassroomQuick} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Create classroom</h3>
                  <input name="name" placeholder="Classroom name" required className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  <textarea name="description" placeholder="Description" className="mt-3 h-20 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  <button className="mt-3 w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600">
                    Create classroom
                  </button>
                </form>

                <form action={createProject} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Create project</h3>
                  <input name="name" placeholder="Project name" required className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  <textarea name="description" placeholder="Description" className="mt-3 h-20 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  <button className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
                    Create project
                  </button>
                </form>

                <form action={createTask} className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-900">Create task</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr]">
                    <input name="title" placeholder="Task title" required className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                    <select
                      name="project_id"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      disabled={demoProjects}
                    >
                      <option value="">Select project</option>
                      {(demoProjects ? displayProjects : safeProjects).map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <input type="date" name="due_date" className="rounded-xl border border-slate-300 px-4 py-3" />
                    <select name="priority" className="rounded-xl border border-slate-300 px-4 py-3" defaultValue="2">
                      <option value="1">Priority 1</option>
                      <option value="2">Priority 2</option>
                      <option value="3">Priority 3</option>
                    </select>
                  </div>
                  <button
                    className="mt-3 w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={demoProjects}
                  >
                    Create task
                  </button>
                </form>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">Recent notifications</h2>
              <div className="mt-4 space-y-3">
                {displayNotifications.length === 0 ? <p className="text-slate-500">No notifications yet.</p> : null}
                {displayNotifications.map((notification) => (
                  <article key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">{notification.type}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{notification.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{notification.body ?? ""}</p>
                    <p className="mt-2 text-xs text-slate-500">{new Date(notification.created_at).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Classrooms</h2>
                <Link className="text-sm text-cyan-700" href="/classrooms">
                  View all
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {displayClassrooms.length === 0 ? <p className="text-slate-500">No classrooms yet.</p> : null}
                {displayClassrooms.map((room) => (
                  <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-900">{room.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{room.description ?? "No description"}</p>
                    {!demoClassrooms ? (
                      <Link className="mt-3 inline-flex text-xs text-cyan-700" href={`/classrooms/${room.id}`}>
                        Open classroom
                      </Link>
                    ) : (
                      <span className="mt-3 inline-flex text-xs text-slate-400">Demo classroom</span>
                    )}
                  </article>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
                <Link className="text-sm text-cyan-700" href="/classrooms">
                  Go to library
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {displayDocuments.length === 0 ? <p className="text-slate-500">No documents yet.</p> : null}
                {displayDocuments.map((doc) => (
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
                <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
                <Link className="text-sm text-cyan-700" href="/classrooms">
                  View all
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {displayAssignments.length === 0 ? <p className="text-slate-500">No assignments yet.</p> : null}
                {displayAssignments.map((assignment) => (
                  <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Published {new Date(assignment.published_at).toLocaleDateString()}
                      {assignment.due_at ? ` · Due ${new Date(assignment.due_at).toLocaleDateString()}` : ""}
                    </p>
                    {!demoAssignments ? (
                      <Link
                        className="mt-3 inline-flex text-xs text-cyan-700"
                        href={`/classrooms/${assignment.classroom_id}/assignments/${assignment.id}`}
                      >
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

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Integrations</h2>
                <Link className="text-sm text-cyan-700" href="/classrooms">
                  Manage
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {displayConnections.length === 0 ? <p className="text-slate-500">No integrations yet.</p> : null}
                {displayConnections.map((connection) => (
                  <article key={connection.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-900">
                      {PROVIDER_LABELS[connection.provider] ?? connection.provider}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{connection.display_name ?? "LMS connection"}</p>
                    {connection.external_class_id ? (
                      <p className="mt-2 text-xs text-slate-500">Class ID: {connection.external_class_id}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Project tasks</h2>
                <span className="text-sm text-slate-500">{openTasks} open</span>
              </div>
              <div className="mt-4 space-y-3">
                {displayTasks.length === 0 ? <p className="text-slate-500">No tasks yet.</p> : null}
                {displayTasks.map((task) => (
                  <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className={task.is_done ? "text-slate-400 line-through" : "text-slate-900"}>{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(typeof task.projects === "object" && task.projects && "name" in task.projects ? String(task.projects.name) : "Project")}
                      {task.due_date ? ` · Due ${task.due_date}` : ""} · Priority {task.priority}
                    </p>
                    {!demoTasks ? (
                      <form action={toggleTask} className="mt-3">
                        <input type="hidden" name="task_id" value={task.id} />
                        <input type="hidden" name="is_done" value={String(task.is_done)} />
                        <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                          {task.is_done ? "Mark open" : "Mark done"}
                        </button>
                      </form>
                    ) : (
                      <span className="mt-3 inline-flex text-xs text-slate-400">Demo task</span>
                    )}
                  </article>
                ))}
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}

