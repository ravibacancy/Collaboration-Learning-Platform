import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseLimit(value: string | null) {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return clamp(Math.floor(parsed), 1, MAX_LIMIT);
}

function parseIsoDate(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function applyFilters(
  query: any,
  classroomId: string | null,
  documentId: string | null,
  from: string | null,
  to: string | null,
) {
  let nextQuery = query;
  if (classroomId) {
    nextQuery = nextQuery.eq("classroom_id", classroomId);
  }
  if (documentId) {
    nextQuery = nextQuery.eq("document_id", documentId);
  }
  if (from) {
    nextQuery = nextQuery.gte("created_at", from);
  }
  if (to) {
    nextQuery = nextQuery.lte("created_at", to);
  }
  return nextQuery;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "summary";
  const classroomId = url.searchParams.get("classroomId");
  const documentId = url.searchParams.get("documentId");
  const limit = parseLimit(url.searchParams.get("limit"));
  const fromParam = parseIsoDate(url.searchParams.get("from"));
  const toParam = parseIsoDate(url.searchParams.get("to"));
  const daysParam = Number(url.searchParams.get("days") ?? 30);
  const days = Number.isFinite(daysParam) ? clamp(Math.floor(daysParam), 1, 365) : 30;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = auth.user.email && isAdminEmail(auth.user.email) ? createServiceClient() : supabase;

  if (mode === "events") {
    const eventsResult = await applyFilters(
      client.from("analytics_events").select("id,event_type,event_data,created_at,classroom_id,document_id,user_id", { count: "exact" }),
      classroomId,
      documentId,
      fromParam,
      toParam,
    )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventsResult.error) {
      return NextResponse.json({ error: eventsResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: eventsResult.data ?? [],
      count: eventsResult.count ?? 0,
    });
  }

  const to = toParam ?? new Date().toISOString();
  const from = fromParam ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, windowResult, recentResult] = await Promise.all([
    applyFilters(client.from("analytics_events").select("id", { count: "exact", head: true }), classroomId, documentId, null, null),
    applyFilters(client.from("analytics_events").select("id", { count: "exact", head: true }), classroomId, documentId, from, to),
    applyFilters(
      client.from("analytics_events").select("id,event_type,event_data,created_at,classroom_id,document_id,user_id"),
      classroomId,
      documentId,
      from,
      to,
    )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (totalResult.error || windowResult.error || recentResult.error) {
    const message = totalResult.error?.message ?? windowResult.error?.message ?? recentResult.error?.message ?? "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const recentEvents = recentResult.data ?? [];
  const eventCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  const uniqueUsers = new Set<string>();

  for (const event of recentEvents) {
    eventCounts.set(event.event_type, (eventCounts.get(event.event_type) ?? 0) + 1);
    const dayKey = new Date(event.created_at).toISOString().slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    if (event.user_id) {
      uniqueUsers.add(event.user_id);
    }
  }

  const byDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const topEvents = Array.from(eventCounts.entries())
    .map(([event_type, count]) => ({ event_type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const windowCount = windowResult.count ?? 0;
  const sampled = windowCount > recentEvents.length;

  return NextResponse.json({
    filters: {
      classroomId: classroomId ?? null,
      documentId: documentId ?? null,
    },
    range: { from, to, days },
    totals: {
      events: totalResult.count ?? 0,
      windowEvents: windowCount,
      uniqueUsers: uniqueUsers.size,
    },
    sampled,
    byDay,
    topEvents,
    recentEvents,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    eventType?: string;
    classroomId?: string;
    documentId?: string;
    eventData?: Record<string, unknown>;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = String(payload.eventType ?? "").trim();
  if (!eventType) {
    return NextResponse.json({ error: "eventType is required" }, { status: 400 });
  }

  const { error } = await supabase.from("analytics_events").insert({
    classroom_id: payload.classroomId ?? null,
    document_id: payload.documentId ?? null,
    user_id: auth.user.id,
    event_type: eventType,
    event_data: payload.eventData ?? {},
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" }, { status: 201 });
}
