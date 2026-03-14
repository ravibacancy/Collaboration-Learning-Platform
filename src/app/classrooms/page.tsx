import Link from "next/link";
import { redirect } from "next/navigation";
import RealtimeRefresh from "@/components/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { acceptInvite, createClassroom, declineInvite, joinClassroom, leaveClassroom, markAllNotificationsRead, markNotificationRead } from "./actions";
import { demoData, withDemo } from "@/lib/demo-data";

type ReferenceMap = Map<string, string>;

type ReferenceRow = {
  id: string;
  classroom_id: string;
};

type PageProps = {
  searchParams: Promise<{ filter?: string; type?: string; join?: string; error?: string; message?: string }>;
};

const NOTIFICATION_TYPES = ["assignment", "submission", "mention", "comment", "invite"] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

type FilterValue = "all" | "unread";

type TypeValue = "all" | NotificationType;

function buildReferenceMap(rows: ReferenceRow[] | null): ReferenceMap {
  return new Map((rows ?? []).map((row) => [row.id, row.classroom_id]));
}

function normalizeFilter(value: string | undefined): FilterValue {
  return value === "unread" ? "unread" : "all";
}

function normalizeType(value: string | undefined): TypeValue {
  return NOTIFICATION_TYPES.includes(value as NotificationType) ? (value as NotificationType) : "all";
}

function buildFilterHref(filter: FilterValue, type: TypeValue): string {
  const params = new URLSearchParams();
  if (filter !== "all") {
    params.set("filter", filter);
  }
  if (type !== "all") {
    params.set("type", type);
  }
  const query = params.toString();
  return query ? `/classrooms?${query}` : "/classrooms";
}

export default async function ClassroomsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filterValue = normalizeFilter(params.filter);
  const typeValue = normalizeType(params.type);
  const joinValue = params.join ?? "";
  const errorMessage = params.error;
  const successMessage = params.message;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const notificationsQuery = supabase
    .from("notifications")
    .select("id,type,title,body,is_read,created_at,reference_type,reference_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (filterValue === "unread") {
    notificationsQuery.eq("is_read", false);
  }

  if (typeValue !== "all") {
    notificationsQuery.eq("type", typeValue);
  }

  const [{ data: classrooms, error }, { data: notifications, error: notificationError }, { data: memberships }] = await Promise.all([
    supabase.from("classrooms").select("id,name,description,created_at").order("created_at", { ascending: false }),
    notificationsQuery.limit(8),
    supabase.from("classroom_members").select("classroom_id,role").eq("user_id", auth.user.id),
  ]);


  const inviteEmail = auth.user.email?.toLowerCase() ?? "";
  let invites: Array<{ id: string; classroom_id: string; role: string; created_at: string }> = [];
  let inviteClassrooms: Array<{ id: string; name: string; description: string | null }> = [];

  if (inviteEmail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const inviteService = createServiceClient();
    const inviteResult = await inviteService
      .from("classroom_invites")
      .select("id,classroom_id,role,created_at")
      .eq("email", inviteEmail)
      .is("accepted_at", null)
      .is("declined_at", null);
    invites = inviteResult.data ?? [];

    const inviteClassroomIds = Array.from(new Set(invites.map((invite) => invite.classroom_id)));
    const inviteClassroomResult = inviteClassroomIds.length
      ? await inviteService.from("classrooms").select("id,name,description").in("id", inviteClassroomIds)
      : { data: [] as Array<{ id: string; name: string; description: string | null }> };
    inviteClassrooms = inviteClassroomResult.data ?? [];
  }

  const inviteClassroomMap = new Map(inviteClassrooms.map((room) => [room.id, room]));

  const { items: displayClassrooms, isDemo: demoClassrooms } = withDemo(classrooms, demoData.classrooms);
  const { items: displayNotifications, isDemo: demoNotifications } = withDemo(notifications, demoData.notifications);
  const { items: displayInvites, isDemo: demoInvites } = withDemo(invites, demoData.invites);
  const resolvedInviteClassroomMap = demoInvites
    ? new Map(demoData.classrooms.map((room) => [room.id, room]))
    : inviteClassroomMap;

  const membershipMap = demoClassrooms
    ? new Map(displayClassrooms.map((room) => [room.id, "teacher"]))
    : new Map((memberships ?? []).map((member) => [member.classroom_id, member.role]));

  const assignmentIds = Array.from(
    new Set(
      displayNotifications
        .filter((item) => item.reference_type === "assignment" && item.reference_id)
        .map((item) => String(item.reference_id)),
    ),
  );

  const documentIds = Array.from(
    new Set(
      displayNotifications
        .filter((item) => item.reference_type === "document" && item.reference_id)
        .map((item) => String(item.reference_id)),
    ),
  );

  const [assignmentRefResult, documentRefResult] = await Promise.all([
    assignmentIds.length
      ? supabase.from("assignments").select("id,classroom_id").in("id", assignmentIds)
      : Promise.resolve({ data: [] as ReferenceRow[] }),
    documentIds.length
      ? supabase.from("documents").select("id,classroom_id").in("id", documentIds)
      : Promise.resolve({ data: [] as ReferenceRow[] }),
  ]);

  const assignmentMap = demoNotifications
    ? new Map(demoData.assignments.map((assignment) => [assignment.id, assignment.classroom_id]))
    : buildReferenceMap(assignmentRefResult.data);
  const documentMap = demoNotifications
    ? new Map(demoData.documents.map((document) => [document.id, document.classroom_id]))
    : buildReferenceMap(documentRefResult.data);
  const filteredNotifications = displayNotifications.filter((item) => {
    if (filterValue === "unread" && item.is_read) {
      return false;
    }
    if (typeValue !== "all" && item.type !== typeValue) {
      return false;
    }
    return true;
  });
  const unreadCount = displayNotifications.filter((item) => !item.is_read).length;
  const hasActiveFilters = filterValue !== "all" || typeValue !== "all";

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Phase 1+2 Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Classroom Workspace</h1>
          <p className="mt-2 text-slate-600">
            Foundation module for classroom management, permissions, document pipeline, and assignments.
          </p>
          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}
          <div className="mt-4 flex gap-3 text-sm">
            <Link className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white" href="/dashboard">
              Legacy dashboard
            </Link>
            <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700" href="/">
              Home
            </Link>
          </div>
          <form action="/search" className="mt-4 flex flex-wrap gap-3">
            <input
              name="q"
              placeholder="Search classrooms, documents, assignments..."
              className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-4 py-3"
            />
            <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600" type="submit">
              Search
            </button>
          </form>
        </header>

        {displayInvites.length > 0 ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Pending invites</h2>
            <p className="mt-1 text-sm text-slate-600">Accept or decline classroom invitations.</p>
            <div className="mt-4 space-y-3">
              {displayInvites.map((invite) => {
                const classroom = resolvedInviteClassroomMap.get(invite.classroom_id);
                return (
                  <article key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{classroom?.name ?? "Classroom"}</p>
                      <p className="text-xs text-slate-500">
                        {invite.role} invite · {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                      {classroom?.description ? <p className="mt-1 text-xs text-slate-500">{classroom.description}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!demoInvites ? (
                        <>
                          <form action={acceptInvite}>
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white" type="submit">
                              Accept
                            </button>
                          </form>
                          <form action={declineInvite}>
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700" type="submit">
                              Decline
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Demo invite</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create classroom</h2>
            <form action={createClassroom} className="mt-4 space-y-3">
              <input
                name="name"
                required
                placeholder="Classroom name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <textarea
                name="description"
                placeholder="Description"
                className="h-24 w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <button className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600" type="submit">
                Create
              </button>
            </form>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Join classroom</h2>
            <form action={joinClassroom} className="mt-4 space-y-3">
              <input
                name="classroom_code"
                defaultValue={joinValue}
                required
                placeholder="Paste classroom code or link"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <p className="text-xs text-slate-500">Ask your teacher for the classroom code or share link.</p>
              <button className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-slate-400" type="submit">
                Join classroom
              </button>
            </form>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Current classrooms</h2>
            {error ? (
              <p className="mt-3 text-sm text-amber-700">
                Run `supabase/phase1_foundation.sql` first to enable classroom tables.
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              {displayClassrooms.length === 0 ? <p className="text-slate-500">No classrooms yet.</p> : null}
              {displayClassrooms.map((room) => (
                <article key={room.id} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{room.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{room.description ?? "No description"}</p>
                  <p className="mt-2 text-xs text-slate-500">Created {new Date(room.created_at).toLocaleDateString()}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
                      {membershipMap.get(room.id) ?? "member"}
                    </span>
                    {!demoClassrooms ? (
                      <>
                        <Link href={`/classrooms/${room.id}`} className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-medium text-white">
                          Open classroom
                        </Link>
                        {membershipMap.get(room.id) !== "owner" ? (
                          <form action={leaveClassroom}>
                            <input type="hidden" name="classroom_id" value={room.id} />
                            <button className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-medium text-rose-700" type="submit">
                              Leave
                            </button>
                          </form>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Demo classroom</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <RealtimeRefresh channel={`notifications-${auth.user.id}`} table="notifications" filter={`user_id=eq.${auth.user.id}`} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Unread {unreadCount}</span>
              {unreadCount > 0 && !demoNotifications ? (
                <form action={markAllNotificationsRead}>
                  <button className="rounded-lg border border-slate-300 px-3 py-1">Mark all read</button>
                </form>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {(["all", "unread"] as FilterValue[]).map((filter) => (
              <Link
                key={filter}
                href={buildFilterHref(filter, typeValue)}
                className={`rounded-full border px-3 py-1 ${filterValue === filter ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {filter === "all" ? "All" : "Unread"}
              </Link>
            ))}
            <span className="text-slate-400">|</span>
            {(["all", ...NOTIFICATION_TYPES] as TypeValue[]).map((type) => (
              <Link
                key={type}
                href={buildFilterHref(filterValue, type)}
                className={`rounded-full border px-3 py-1 ${typeValue === type ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {type === "all" ? "All types" : type}
              </Link>
            ))}
            {hasActiveFilters ? (
              <Link href="/classrooms" className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
                Clear
              </Link>
            ) : null}
          </div>
          {notificationError ? (
            <p className="mt-3 text-sm text-amber-700">Run `supabase/phase3_collaboration.sql` to enable notifications.</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {filteredNotifications.length === 0 ? <p className="text-slate-500">No notifications yet.</p> : null}
            {filteredNotifications.map((item) => {
              const referenceId = item.reference_id ? String(item.reference_id) : "";
              const assignmentClassroomId = item.reference_type === "assignment" ? assignmentMap.get(referenceId) : null;
              const documentClassroomId = item.reference_type === "document" ? documentMap.get(referenceId) : null;

              const link = assignmentClassroomId
                ? `/classrooms/${assignmentClassroomId}/assignments/${referenceId}`
                : documentClassroomId
                  ? `/classrooms/${documentClassroomId}/documents/${referenceId}`
                  : null;

              return (
                <article key={item.id} className={`rounded-2xl border p-4 ${item.is_read ? "border-slate-200" : "border-cyan-300 bg-cyan-50"}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">{item.type}</p>
                  <h3 className="mt-1 font-semibold text-slate-900">
                    {link ? (
                      <Link href={link} className="underline-offset-4 hover:underline">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{item.body ?? ""}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                      {link && !demoNotifications ? (
                        <Link className="rounded-lg border border-slate-300 px-3 py-1 text-xs" href={link}>
                          Open
                        </Link>
                      ) : link ? (
                        <span className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-400">Demo link</span>
                      ) : null}
                      {!item.is_read && !demoNotifications ? (
                        <form action={markNotificationRead}>
                          <input type="hidden" name="notification_id" value={item.id} />
                          <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Mark read</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

