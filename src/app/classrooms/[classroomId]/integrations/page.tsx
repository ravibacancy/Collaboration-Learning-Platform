import Link from "next/link";
import { redirect } from "next/navigation";
import type { Json } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { createIntegrationConnection, removeIntegrationConnection, syncGoogleClassroom, updateIntegrationConnection } from "./actions";
import { demoData, withDemo } from "@/lib/demo-data";

type PageProps = {
  params: Promise<{ classroomId: string }>;
};

type ConnectionRow = {
  id: string;
  provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
  status: "pending" | "connected" | "error";
  external_class_id: string | null;
  display_name: string | null;
  created_at: string;
  config: Json | null;
};

const PROVIDER_LABELS: Record<ConnectionRow["provider"], string> = {
  google_classroom: "Google Classroom",
  canvas: "Canvas",
  schoology: "Schoology",
  microsoft_teams: "Microsoft Teams",
};

const STATUS_STYLES: Record<ConnectionRow["status"], string> = {
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
};

function toConfig(value: Json | null): Record<string, unknown> {
  return typeof value === "object" && value && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function IntegrationsPage({ params }: PageProps) {
  const { classroomId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const [{ data: classroom }, { data: connections, error: connectionError }] = await Promise.all([
    supabase.from("classrooms").select("id,name").eq("id", classroomId).single(),
    supabase
      .from("integration_connections")
      .select("id,provider,status,external_class_id,display_name,created_at,config")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false }),
  ]);

  const { items: displayConnections, isDemo: demoConnections } = withDemo(connections, demoData.integrations);

  if (!classroom) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Classroom not found or not accessible.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Phase 4 Integrations</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{classroom.name} Integrations</h1>
          <p className="mt-2 text-slate-600">Track LMS connections and start cloud document sources.</p>
          <div className="mt-4">
            <Link
              href={`/classrooms/${classroomId}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Back to classroom
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Connect an LMS</h2>
            <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-sm font-semibold text-cyan-800">Google Classroom</p>
              <p className="mt-1 text-xs text-cyan-700">OAuth connection required to sync coursework and grades.</p>
              {!demoConnections ? (
                <Link
                  href={`/api/integrations/google/start?classroomId=${classroomId}`}
                  className="mt-3 inline-flex rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
                >
                  Connect Google Classroom
                </Link>
              ) : (
                <span className="mt-3 inline-flex rounded-xl border border-cyan-200 px-4 py-2 text-sm text-cyan-700">
                  Demo connection
                </span>
              )}
            </div>
            <form action={createIntegrationConnection} className="mt-4 space-y-3">
              <input type="hidden" name="classroom_id" value={classroomId} />
              <select name="provider" required className="w-full rounded-xl border border-slate-300 px-4 py-3" disabled={demoConnections}>
                <option value="">Select provider</option>
                <option value="canvas">Canvas</option>
                <option value="schoology">Schoology</option>
                <option value="microsoft_teams">Microsoft Teams</option>
              </select>
              <input
                name="display_name"
                placeholder="Integration label (optional)"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <input
                name="external_class_id"
                placeholder="External class ID (optional)"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <button
                type="submit"
                className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={demoConnections}
              >
                Connect
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              OAuth and roster sync can be layered on top once provider credentials are configured.
            </p>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Current connections</h2>
            {connectionError ? <p className="mt-2 text-sm text-amber-700">Run `supabase/phase4_integrations.sql` to enable integrations.</p> : null}
            <div className="mt-4 space-y-3">
              {displayConnections.length === 0 ? <p className="text-slate-500">No connections yet.</p> : null}
              {displayConnections.map((connection) => {
                const config = toConfig(connection.config ?? null);
                const lastError = typeof config.last_error === "string" ? config.last_error : null;
                const lastSyncedAt = typeof config.last_synced_at === "string" ? config.last_synced_at : null;
                const lastSyncStats = typeof config.last_sync_stats === "object" && config.last_sync_stats && !Array.isArray(config.last_sync_stats)
                  ? (config.last_sync_stats as Record<string, unknown>)
                  : null;

                return (
                  <article key={connection.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{PROVIDER_LABELS[connection.provider]}</h3>
                        <p className="text-sm text-slate-600">{connection.display_name ?? "LMS connection"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLES[connection.status]}`}>
                        {connection.status}
                      </span>
                    </div>

                    {!demoConnections ? (
                      <form action={updateIntegrationConnection} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input type="hidden" name="classroom_id" value={classroomId} />
                        <input type="hidden" name="connection_id" value={connection.id} />
                        <input
                          name="display_name"
                          defaultValue={connection.display_name ?? ""}
                          placeholder="Display name"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          name="external_class_id"
                          defaultValue={connection.external_class_id ?? ""}
                          placeholder="External class ID"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs">Update</button>
                      </form>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">Demo connection settings</p>
                    )}

                    {connection.external_class_id ? (
                      <p className="mt-2 text-xs text-slate-500">Class ID: {connection.external_class_id}</p>
                    ) : (
                      <p className="mt-2 text-xs text-amber-600">Add a class ID to enable sync.</p>
                    )}

                    {lastSyncedAt ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Last sync {new Date(lastSyncedAt).toLocaleString()}
                        {lastSyncStats ? ` · coursework ${String(lastSyncStats.coursework ?? 0)}, submissions ${String(lastSyncStats.submissions ?? 0)}` : ""}
                      </p>
                    ) : null}

                    {lastError ? <p className="mt-2 text-xs text-rose-600">Sync error: {lastError}</p> : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>Connected {new Date(connection.created_at).toLocaleDateString()}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {!demoConnections && connection.provider === "google_classroom" ? (
                          <form action={syncGoogleClassroom}>
                            <input type="hidden" name="classroom_id" value={classroomId} />
                            <input type="hidden" name="connection_id" value={connection.id} />
                            <button className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700">
                              Sync now
                            </button>
                          </form>
                        ) : null}
                        {!demoConnections ? (
                          <form action={removeIntegrationConnection}>
                            <input type="hidden" name="classroom_id" value={classroomId} />
                            <input type="hidden" name="connection_id" value={connection.id} />
                            <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Remove</button>
                          </form>
                        ) : (
                          <span className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-400">Demo</span>
                        )}
                      </div>
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
