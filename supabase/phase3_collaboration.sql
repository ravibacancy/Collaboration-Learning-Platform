-- Phase 3 Collaboration: assignments workflow, submissions, notifications.
-- Run after supabase/schema.sql and supabase/phase1_foundation.sql

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  submission_text text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'returned')),
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (assignment_id, student_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  reference_type text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_assignment_submissions_assignment on public.assignment_submissions(assignment_id);
create index if not exists idx_assignment_submissions_student on public.assignment_submissions(student_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

drop trigger if exists trg_assignment_submissions_updated_at on public.assignment_submissions;
create trigger trg_assignment_submissions_updated_at
before update on public.assignment_submissions
for each row execute procedure public.set_updated_at();

alter table public.assignment_submissions enable row level security;
alter table public.notifications enable row level security;

-- Assignment submissions policies

drop policy if exists "Students and teachers can read submissions" on public.assignment_submissions;
create policy "Students and teachers can read submissions"
on public.assignment_submissions for select
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    join public.classroom_members cm on cm.classroom_id = a.classroom_id
    where a.id = assignment_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

drop policy if exists "Students can create own submissions" on public.assignment_submissions;
create policy "Students can create own submissions"
on public.assignment_submissions for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments a
    join public.classroom_members cm on cm.classroom_id = a.classroom_id
    where a.id = assignment_id
      and cm.user_id = auth.uid()
      and cm.role = 'student'
  )
);

drop policy if exists "Students can update own submissions" on public.assignment_submissions;
create policy "Students can update own submissions"
on public.assignment_submissions for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());


-- Teachers can update submission status

drop policy if exists "Teachers can update submissions" on public.assignment_submissions;
create policy "Teachers can update submissions"
on public.assignment_submissions for update
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.classroom_members cm on cm.classroom_id = a.classroom_id
    where a.id = assignment_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.assignments a
    join public.classroom_members cm on cm.classroom_id = a.classroom_id
    where a.id = assignment_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);
-- Notifications policies

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
using (user_id = auth.uid());

drop policy if exists "Users can insert notifications they send" on public.notifications;
create policy "Users can insert notifications they send"
on public.notifications for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
-- Realtime publication hooks
DO  BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.annotations;
EXCEPTION WHEN duplicate_object THEN NULL;
END ;
DO  BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END ;

DO  BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END ;
DO  BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END ;