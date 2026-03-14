import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { signOut } from "@/app/auth/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/classrooms", label: "Classrooms" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/search", label: "Search" },
  { href: "/classrooms", label: "Workspace" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/admin-login?error=Please%20sign%20in%20to%20access%20admin");
  }

  if (!isAdminEmail(auth.user.email)) {
    redirect("/admin-login?error=You%20do%20not%20have%20admin%20access");
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-6 h-64 w-64 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="absolute top-1/2 -left-24 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <aside className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur lg:sticky lg:top-6 lg:w-[260px]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">K</div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
              <p className="text-lg font-semibold text-slate-900">BACANCY Console</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:border-slate-400">
                {item.label}
              </Link>
            ))}
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

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
