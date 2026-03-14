import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { demoData } from "@/lib/demo-data";

type AnalyticsEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  classroom_id: string | null;
  document_id: string | null;
  user_id: string | null;
  event_data: Record<string, unknown> | null;
};

type ClassroomRow = {
  id: string;
  name: string;
};

type CountRow = {
  event_type: string;
  count: number;
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function AdminAnalyticsPage() {
  const supabase = createServiceClient();
  const now = Date.now();
  const last7Iso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30Iso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, last7Result, last30Result, recentEventsResult, topEventsResult, topClassroomsResult, classroomsResult] =
    await Promise.all([
      supabase.from("analytics_events").select("id", { count: "exact", head: true }),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", last7Iso),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", last30Iso),
      supabase
        .from("analytics_events")
        .select("id,event_type,event_data,created_at,classroom_id,document_id,user_id")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("analytics_events").select("event_type").gte("created_at", last30Iso).order("created_at", { ascending: false }).limit(500),
      supabase.from("analytics_events").select("classroom_id").gte("created_at", last30Iso).order("created_at", { ascending: false }).limit(500),
      supabase.from("classrooms").select("id,name"),
    ]);

  const demoMode = (totalResult.count ?? 0) === 0;
  const classrooms = classroomsResult.data ?? (demoMode ? demoData.classrooms : []);
  const classroomMap = new Map((classrooms as ClassroomRow[]).map((room) => [room.id, room.name]));

  const recentEvents = (demoMode ? demoData.analyticsEvents.slice(0, 12) : (recentEventsResult.data ?? [])) as AnalyticsEventRow[];
  const eventsForCounts = demoMode ? demoData.analyticsEvents : (topEventsResult.data ?? []);
  const classroomsForCounts = demoMode ? demoData.analyticsEvents : (topClassroomsResult.data ?? []);
  const eventTypeCounts = new Map<string, number>();
  const classroomCounts = new Map<string, number>();

  for (const event of eventsForCounts) {
    eventTypeCounts.set(event.event_type, (eventTypeCounts.get(event.event_type) ?? 0) + 1);
  }

  for (const row of classroomsForCounts) {
    const classroomId = row.classroom_id;
    if (!classroomId) continue;
    classroomCounts.set(classroomId, (classroomCounts.get(classroomId) ?? 0) + 1);
  }

  const topEventTypes: CountRow[] = Array.from(eventTypeCounts.entries())
    .map(([event_type, count]) => ({ event_type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const topClassrooms: Array<{ id: string; name: string; count: number }> = Array.from(classroomCounts.entries())
    .map(([id, count]) => ({
      id,
      name: classroomMap.get(id) ?? id.slice(0, 8),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const userSampleLimit = 2000;
  const { data: recentUsers } = demoMode
    ? { data: demoData.analyticsEvents.map((event) => ({ user_id: event.user_id })) }
    : await supabase
        .from("analytics_events")
        .select("user_id")
        .gte("created_at", last30Iso)
        .limit(userSampleLimit);

  const uniqueUsers = new Set((recentUsers ?? []).map((row) => row.user_id).filter((id): id is string => Boolean(id)));
  const activeClassrooms = new Set(
    (demoMode ? demoData.analyticsEvents : (topClassroomsResult.data ?? [])).map((row) => row.classroom_id).filter((id): id is string => Boolean(id)),
  );

  const days = 14;
  const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const dayStarts = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });

  const dailyCounts = demoMode
    ? dayStarts.map((day) => {
        const next = new Date(day);
        next.setUTCDate(day.getUTCDate() + 1);
        const count = demoData.analyticsEvents.filter((event) => event.created_at >= day.toISOString() && event.created_at < next.toISOString()).length;
        return { date: day.toISOString().slice(0, 10), count };
      })
    : await Promise.all(
        dayStarts.map(async (day) => {
          const next = new Date(day);
          next.setUTCDate(day.getUTCDate() + 1);
          const { count } = await supabase
            .from("analytics_events")
            .select("id", { count: "exact", head: true })
            .gte("created_at", day.toISOString())
            .lt("created_at", next.toISOString());

          return { date: day.toISOString().slice(0, 10), count: count ?? 0 };
        }),
      );

  const maxDaily = Math.max(1, ...dailyCounts.map((item) => item.count));

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Analytics</h1>
            <p className="mt-2 text-slate-600">Monitor engagement, views, and annotation activity across BACANCY.</p>
          </div>
          <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/api/analytics?mode=events&limit=25">
            View API sample
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total events", value: demoMode ? demoData.analyticsEvents.length : totalResult.count ?? 0 },
          { label: "Last 7 days", value: demoMode ? demoData.analyticsEvents.slice(0, 7).length : last7Result.count ?? 0 },
          { label: "Last 30 days", value: demoMode ? demoData.analyticsEvents.length : last30Result.count ?? 0 },
          { label: "Active users (30d)", value: uniqueUsers.size },
          { label: "Active classrooms (30d)", value: activeClassrooms.size },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Activity (last 14 days)</h2>
            <p className="text-xs text-slate-500">UTC</p>
          </div>
          <div className="mt-6 grid gap-3">
            {dailyCounts.map((day) => (
              <div key={day.date} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-sm text-slate-600">
                <span>{formatDateLabel(day.date)}</span>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${(day.count / maxDaily) * 100}%` }} />
                </div>
                <span className="text-slate-900">{day.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-900">Top event types</h2>
          <p className="mt-1 text-xs text-slate-500">Sampled from latest 500 events.</p>
          <div className="mt-4 space-y-3">
            {topEventTypes.length === 0 ? <p className="text-slate-500">No events yet.</p> : null}
            {topEventTypes.map((item) => (
              <div key={item.event_type} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <span className="font-semibold text-slate-900">{item.event_type}</span>
                <span className="text-slate-600">{item.count}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-900">Top classrooms</h2>
          <p className="mt-1 text-xs text-slate-500">Sampled from latest 500 events.</p>
          <div className="mt-4 space-y-3">
            {topClassrooms.length === 0 ? <p className="text-slate-500">No classroom activity yet.</p> : null}
            {topClassrooms.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <span className="font-semibold text-slate-900">{item.name}</span>
                <span className="text-slate-600">{item.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">Recent events</h2>
          <div className="mt-4 space-y-3">
            {recentEvents.length === 0 ? <p className="text-slate-500">No events logged yet.</p> : null}
            {recentEvents.map((event) => {
              const classroomName = event.classroom_id ? classroomMap.get(event.classroom_id) ?? event.classroom_id.slice(0, 8) : "N/A";
              const documentLink =
                event.classroom_id && event.document_id ? `/classrooms/${event.classroom_id}/documents/${event.document_id}` : null;

              return (
                <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{event.event_type}</p>
                    <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Classroom: {classroomName}</p>
                  {documentLink ? (
                    <Link className="mt-2 inline-flex text-xs text-cyan-700" href={documentLink}>
                      Open document
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
