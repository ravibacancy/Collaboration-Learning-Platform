import { createServiceClient } from "@/lib/supabase/service";
import { demoData, withDemo } from "@/lib/demo-data";

export default async function AdminNotificationsPage() {
  const supabase = createServiceClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,type,title,body,is_read,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(20);

  const { items: safeNotifications } = withDemo(notifications, demoData.notifications);

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-2 text-slate-600">Latest alerts delivered to your account.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {safeNotifications.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>No notifications yet.</td>
                </tr>
              ) : (
                safeNotifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-600">{notification.type}</td>
                    <td className="px-4 py-4 text-slate-600">{notification.user_id.slice(0, 8)}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{notification.title}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{notification.body ?? ""}</td>
                    <td className="px-4 py-4 text-slate-600">{notification.is_read ? "Read" : "Unread"}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(notification.created_at).toLocaleString()}</td>
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
