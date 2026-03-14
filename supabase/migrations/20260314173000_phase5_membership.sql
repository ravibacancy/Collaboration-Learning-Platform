-- Phase 5 Membership: join codes, invites, and self-service membership.

create extension if not exists "pgcrypto";

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

alter table public.classrooms add column if not exists join_code text;

update public.classrooms
set join_code = public.generate_join_code()
where join_code is null;

alter table public.classrooms alter column join_code set default public.generate_join_code();
alter table public.classrooms alter column join_code set not null;

create unique index if not exists idx_classrooms_join_code_unique on public.classrooms(join_code);

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

create index if not exists idx_classroom_invites_classroom_id on public.classroom_invites(classroom_id);
create index if not exists idx_classroom_invites_email on public.classroom_invites(email);
create unique index if not exists idx_classroom_invites_unique on public.classroom_invites(classroom_id, email);

alter table public.classroom_invites enable row level security;

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

create policy "Members can leave classrooms"
on public.classroom_members for delete
to authenticated
using (user_id = auth.uid());

grant execute on function public.generate_join_code() to authenticated;
