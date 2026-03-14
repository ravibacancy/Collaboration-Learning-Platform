import Link from "next/link";
import { adminSignInWithGoogle, adminSignInWithPassword } from "./actions";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Admin Access</p>
          <h1 className="mt-4 text-3xl font-semibold">Sign in to the admin console</h1>
          <p className="mt-3 text-slate-300">
            Admin accounts are controlled by the allowlist in <code>ADMIN_EMAILS</code>.
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <p>Need a standard user login?</p>
            <Link href="/login" className="text-cyan-300 underline-offset-4 hover:underline">
              Go to user sign in
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <p className="mb-4 rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            Set <code>ADMIN_EMAILS</code> in <code>.env.local</code> to a comma-separated list of admin emails.
          </p>
          {params.error ? <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">{params.error}</p> : null}
          {params.message ? <p className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{params.message}</p> : null}

          <form action={adminSignInWithPassword} className="space-y-3">
            <input className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3" name="email" type="email" placeholder="Admin email" required />
            <input className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3" name="password" type="password" placeholder="Password" required minLength={6} />
            <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300" type="submit">
              Sign in as admin
            </button>
          </form>

          <form action={adminSignInWithGoogle} className="mt-5">
            <button className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-semibold hover:bg-white/20" type="submit">
              Continue with Google
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
