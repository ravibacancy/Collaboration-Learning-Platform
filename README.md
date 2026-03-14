# BACANCY Workspace

Production-ready Next.js (App Router) starter with Supabase auth + database, classroom workflows, and Vercel deployment setup.

## Stack

- Next.js 16 App Router + TypeScript
- Supabase Auth (email/password + Google OAuth)
- Supabase Postgres with Row Level Security policies
- Tailwind CSS 4 responsive UI

## 1) Install and Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 2) Configure Supabase

1. Create a Supabase project.
2. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
   - `supabase/phase1_foundation.sql`
   - `supabase/phase3_collaboration.sql`
   - `supabase/phase4_reliability.sql`
   - `supabase/phase4_integrations.sql`
   - `supabase/phase4_google_classroom.sql`
   - `supabase/phase7_platform.sql`
   - `supabase/seed.sql`
3. In Supabase Storage, create a bucket named `documents` and mark it **public** for preview URLs.
4. Copy keys into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

Optional: seed via script instead of SQL:

```bash
npm run seed
```

## 3) Auth Settings

In Supabase Auth settings:

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_VERCEL_DOMAIN/auth/callback`

Enable Google provider and set its OAuth credentials if you want Google sign-in.

## 3b) Google Classroom Integration (Phase 4)

Set these environment variables in `.env.local` (server only):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CLASSROOM_REDIRECT_URI` (optional, defaults to `NEXT_PUBLIC_APP_URL/api/integrations/google/callback`)

In Google Cloud Console, enable the Classroom API for your project and add the redirect URI above.
Then connect from the classroom Integrations page.

## 3c) Invite Emails (Optional)

Set these to enable real email sending via Resend:
- `RESEND_API_KEY`
- `RESEND_FROM`
- `NEXT_PUBLIC_APP_URL`

Without these, invites are stored in `email_outbox` but not sent.

## 4) Quality Checks

```bash
npm run lint
npm run type-check
npm run build
```

## 5) Deploy to Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Add environment variables from `.env.example` in Vercel Project Settings.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel production URL (for example `https://your-app.vercel.app`).
5. Deploy.

## Project Structure

- `src/app/page.tsx` public landing page with seeded data preview
- `src/app/login` user login page
- `src/app/signup` user registration page
- `src/app/auth/*` auth server actions + callback route
- `src/app/classrooms/*` classroom management and collaboration
- `src/lib/supabase/*` Supabase SSR/browser/middleware clients
- `supabase/schema.sql` base schema + RLS policies
- `supabase/phase1_foundation.sql` classroom domain tables + policies
- `supabase/phase7_platform.sql` platform tables (permissions, templates, analytics, version history)
- `supabase/seed.sql` demo seed data
- `scripts/seed.mjs` repeatable seed script

## Blueprint Phases

- Current implementation has started **Phase 1 Foundation** from the Kami blueprint.
- Run `supabase/phase1_foundation.sql` after `supabase/schema.sql`.
- See `docs/PHASE_PLAN.md` for the full roadmap.
