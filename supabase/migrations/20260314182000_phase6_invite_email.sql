-- Phase 6 Invites: email outbox + audit events.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_event_type') then
    create type public.audit_event_type as enum (
      'invite_sent',
      'invite_accepted',
      'invite_declined',
      'invite_revoked',
      'member_joined',
      'member_left',
      'member_role_updated'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type public.email_status as enum ('pending', 'sent', 'failed');
  end if;
end;
$$;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type public.audit_event_type not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_events_classroom_id on public.audit_events(classroom_id);

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

create index if not exists idx_email_outbox_status on public.email_outbox(status);

alter table public.audit_events enable row level security;
alter table public.email_outbox enable row level security;

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

-- Email outbox is written via service role only.
