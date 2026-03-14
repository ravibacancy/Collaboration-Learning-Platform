-- Phase 4 LMS (Google Classroom): OAuth state, tokens, and sync tables.
-- Run after supabase/phase4_integrations.sql

create unique index if not exists uq_integration_connections_provider
  on public.integration_connections (classroom_id, provider);

create table if not exists public.integration_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  provider public.integration_provider not null,
  state text not null,
  code_verifier text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_integration_oauth_states_state on public.integration_oauth_states(state);
create index if not exists idx_integration_oauth_states_user on public.integration_oauth_states(user_id);

alter table public.integration_oauth_states enable row level security;

drop policy if exists "Users can manage integration oauth states" on public.integration_oauth_states;
create policy "Users can manage integration oauth states"
on public.integration_oauth_states for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (connection_id)
);

drop trigger if exists trg_integration_tokens_updated_at on public.integration_tokens;
create trigger trg_integration_tokens_updated_at
before update on public.integration_tokens
for each row execute procedure public.set_updated_at();

alter table public.integration_tokens enable row level security;

create table if not exists public.lms_courses (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  external_id text not null,
  name text not null,
  section text,
  room text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (connection_id, external_id)
);

drop trigger if exists trg_lms_courses_updated_at on public.lms_courses;
create trigger trg_lms_courses_updated_at
before update on public.lms_courses
for each row execute procedure public.set_updated_at();

create index if not exists idx_lms_courses_classroom on public.lms_courses(classroom_id);
create index if not exists idx_lms_courses_connection on public.lms_courses(connection_id);

create table if not exists public.lms_coursework (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_external_id text not null,
  external_id text not null,
  title text not null,
  description text,
  state text,
  due_at timestamptz,
  max_points numeric,
  alternate_link text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (connection_id, external_id)
);

drop trigger if exists trg_lms_coursework_updated_at on public.lms_coursework;
create trigger trg_lms_coursework_updated_at
before update on public.lms_coursework
for each row execute procedure public.set_updated_at();

create index if not exists idx_lms_coursework_classroom on public.lms_coursework(classroom_id);
create index if not exists idx_lms_coursework_connection on public.lms_coursework(connection_id);
create index if not exists idx_lms_coursework_course on public.lms_coursework(course_external_id);

create table if not exists public.lms_submissions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_external_id text not null,
  coursework_external_id text not null,
  external_id text not null,
  student_external_id text,
  state text,
  assigned_grade numeric,
  draft_grade numeric,
  late boolean,
  submitted_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (connection_id, external_id)
);

drop trigger if exists trg_lms_submissions_updated_at on public.lms_submissions;
create trigger trg_lms_submissions_updated_at
before update on public.lms_submissions
for each row execute procedure public.set_updated_at();

create index if not exists idx_lms_submissions_classroom on public.lms_submissions(classroom_id);
create index if not exists idx_lms_submissions_connection on public.lms_submissions(connection_id);
create index if not exists idx_lms_submissions_coursework on public.lms_submissions(coursework_external_id);

alter table public.lms_courses enable row level security;
alter table public.lms_coursework enable row level security;
alter table public.lms_submissions enable row level security;

drop policy if exists "Classroom members can read LMS courses" on public.lms_courses;
create policy "Classroom members can read LMS courses"
on public.lms_courses for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Teachers and owners can manage LMS courses" on public.lms_courses;
create policy "Teachers and owners can manage LMS courses"
on public.lms_courses for all
to authenticated
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

drop policy if exists "Classroom members can read LMS coursework" on public.lms_coursework;
create policy "Classroom members can read LMS coursework"
on public.lms_coursework for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Teachers and owners can manage LMS coursework" on public.lms_coursework;
create policy "Teachers and owners can manage LMS coursework"
on public.lms_coursework for all
to authenticated
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

drop policy if exists "Classroom members can read LMS submissions" on public.lms_submissions;
create policy "Classroom members can read LMS submissions"
on public.lms_submissions for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Teachers and owners can manage LMS submissions" on public.lms_submissions;
create policy "Teachers and owners can manage LMS submissions"
on public.lms_submissions for all
to authenticated
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);
