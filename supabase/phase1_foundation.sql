-- Phase 1 Foundation: classroom-oriented domain model for digital document learning platform.
-- Run after supabase/schema.sql

create extension if not exists "pgcrypto";

create type public.classroom_role as enum ('owner', 'teacher', 'student');
create type public.document_status as enum ('draft', 'active', 'archived');
create type public.audit_event_type as enum ('invite_sent', 'invite_accepted', 'invite_declined', 'invite_revoked', 'member_joined', 'member_left', 'member_role_updated');
create type public.email_status as enum ('pending', 'sent', 'failed');

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  join_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classroom_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.classroom_role not null default 'student',
  created_at timestamptz not null default timezone('utc', now()),
  unique(classroom_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text not null default 'pdf',
  status public.document_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  title text not null,
  instructions text,
  due_at timestamptz,
  published_by uuid not null references auth.users(id) on delete cascade,
  published_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number integer not null default 1,
  annotation_type text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  annotation_id uuid references public.annotations(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type public.audit_event_type not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete set null,
  invite_id uuid references public.classroom_invites(id) on delete set null,
  triggered_by uuid references auth.users(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text not null,
  status public.email_status not null default 'pending',
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create table if not exists public.classroom_invites (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  email text not null,
  role public.classroom_role not null default 'student',
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  declined_at timestamptz,
  constraint classroom_invites_role_check check (role in ('teacher', 'student'))
);

create index if not exists idx_classrooms_owner_id on public.classrooms(owner_id);
create index if not exists idx_classroom_members_classroom_id on public.classroom_members(classroom_id);
create index if not exists idx_classroom_members_user_id on public.classroom_members(user_id);
create index if not exists idx_documents_classroom_id on public.documents(classroom_id);
create index if not exists idx_assignments_classroom_id on public.assignments(classroom_id);
create index if not exists idx_annotations_document_id on public.annotations(document_id);
create index if not exists idx_comments_document_id on public.comments(document_id);
create index if not exists idx_classroom_invites_classroom_id on public.classroom_invites(classroom_id);
create index if not exists idx_classroom_invites_email on public.classroom_invites(email);
create unique index if not exists idx_classroom_invites_unique on public.classroom_invites(classroom_id, email);
create index if not exists idx_audit_events_classroom_id on public.audit_events(classroom_id);
create index if not exists idx_email_outbox_status on public.email_outbox(status);

create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.classrooms where join_code = code);
  end loop;
  return code;
end;
$$;

update public.classrooms
set join_code = public.generate_join_code()
where join_code is null;

alter table public.classrooms alter column join_code set default public.generate_join_code();
alter table public.classrooms alter column join_code set not null;

create unique index if not exists idx_classrooms_join_code_unique on public.classrooms(join_code);

-- Reuse existing trigger function

drop trigger if exists trg_classrooms_updated_at on public.classrooms;
create trigger trg_classrooms_updated_at
before update on public.classrooms
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_annotations_updated_at on public.annotations;
create trigger trg_annotations_updated_at
before update on public.annotations
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row execute procedure public.set_updated_at();

-- Automatically add classroom owner as member
create or replace function public.add_classroom_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.classroom_members (classroom_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (classroom_id, user_id) do update set role = 'owner';

  return new;
end;
$$;

drop trigger if exists trg_classroom_owner_membership on public.classrooms;
create trigger trg_classroom_owner_membership
after insert on public.classrooms
for each row execute procedure public.add_classroom_owner_membership();

alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.documents enable row level security;
alter table public.assignments enable row level security;
alter table public.annotations enable row level security;
alter table public.comments enable row level security;
alter table public.classroom_invites enable row level security;
alter table public.audit_events enable row level security;
alter table public.email_outbox enable row level security;

-- Classrooms policies
create policy "Classroom members can read classrooms"
on public.classrooms for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = id
      and cm.user_id = auth.uid()
  )
);

create policy "Authenticated users can create classrooms"
on public.classrooms for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update classrooms"
on public.classrooms for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Owners can delete classrooms"
on public.classrooms for delete
to authenticated
using (owner_id = auth.uid());

-- Membership policies
create policy "Members can read membership roster"
on public.classroom_members for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Owners can manage members"
on public.classroom_members for insert
to authenticated
with check (
  exists (
    select 1 from public.classrooms c
    where c.id = classroom_id
      and c.owner_id = auth.uid()
  )
);

create policy "Owners can update members"
on public.classroom_members for update
to authenticated
using (
  exists (
    select 1 from public.classrooms c
    where c.id = classroom_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.classrooms c
    where c.id = classroom_id
      and c.owner_id = auth.uid()
  )
);

create policy "Owners can remove members"
on public.classroom_members for delete
to authenticated
using (
  exists (
    select 1 from public.classrooms c
    where c.id = classroom_id
      and c.owner_id = auth.uid()
  )
);

create policy "Members can leave classrooms"
on public.classroom_members for delete
to authenticated
using (user_id = auth.uid());

-- Documents policies
create policy "Classroom members can read documents"
on public.documents for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers and owners can upload documents"
on public.documents for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Document owners can update documents"
on public.documents for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Document owners can delete documents"
on public.documents for delete
to authenticated
using (owner_id = auth.uid());

-- Assignments policies
create policy "Classroom members can read assignments"
on public.assignments for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers and owners can publish assignments"
on public.assignments for insert
to authenticated
with check (
  published_by = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Publishers can update assignments"
on public.assignments for update
to authenticated
using (published_by = auth.uid())
with check (published_by = auth.uid());

create policy "Publishers can delete assignments"
on public.assignments for delete
to authenticated
using (published_by = auth.uid());

-- Annotation and comment policies
create policy "Classroom members can read annotations"
on public.annotations for select
using (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);

create policy "Classroom members can create annotations"
on public.annotations for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);

create policy "Users can edit own annotations"
on public.annotations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own annotations"
on public.annotations for delete
to authenticated
using (user_id = auth.uid());

create policy "Classroom members can read comments"
on public.comments for select
using (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);

create policy "Classroom members can create comments"
on public.comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);

create policy "Users can edit own comments"
on public.comments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own comments"
on public.comments for delete
to authenticated
using (user_id = auth.uid());

-- Classroom invites policies
create policy "Teachers can read invites"
on public.classroom_invites for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Teachers can create invites"
on public.classroom_invites for insert
to authenticated
with check (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Teachers can delete invites"
on public.classroom_invites for delete
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Users can read own invites"
on public.classroom_invites for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "Members can read audit events"
on public.audit_events for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Members can create audit events"
on public.audit_events for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

grant execute on function public.generate_join_code() to authenticated;
