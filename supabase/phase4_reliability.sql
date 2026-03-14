-- Phase 4 Reliability: annotation version history.
-- Run after supabase/schema.sql, supabase/phase1_foundation.sql, supabase/phase3_collaboration.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'annotation_version_action'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.annotation_version_action AS ENUM ('created', 'updated', 'deleted');
  END IF;
END $$;

create table if not exists public.annotation_versions (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid,
  document_id uuid not null references public.documents(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action public.annotation_version_action not null,
  annotation_type text not null,
  page_number integer not null,
  content jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_annotation_versions_document_id on public.annotation_versions(document_id);
create index if not exists idx_annotation_versions_annotation_id on public.annotation_versions(annotation_id);
create index if not exists idx_annotation_versions_actor_id on public.annotation_versions(actor_id);
create index if not exists idx_annotation_versions_captured_at on public.annotation_versions(captured_at);

create or replace function public.log_annotation_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  if (tg_op = 'INSERT') then
    v_actor := coalesce(auth.uid(), new.user_id);
    insert into public.annotation_versions (
      annotation_id,
      document_id,
      actor_id,
      action,
      annotation_type,
      page_number,
      content
    ) values (
      new.id,
      new.document_id,
      v_actor,
      'created',
      new.annotation_type,
      new.page_number,
      new.content
    );
    return new;
  elsif (tg_op = 'UPDATE') then
    v_actor := coalesce(auth.uid(), new.user_id);
    insert into public.annotation_versions (
      annotation_id,
      document_id,
      actor_id,
      action,
      annotation_type,
      page_number,
      content
    ) values (
      new.id,
      new.document_id,
      v_actor,
      'updated',
      new.annotation_type,
      new.page_number,
      new.content
    );
    return new;
  elsif (tg_op = 'DELETE') then
    v_actor := coalesce(auth.uid(), old.user_id);
    insert into public.annotation_versions (
      annotation_id,
      document_id,
      actor_id,
      action,
      annotation_type,
      page_number,
      content
    ) values (
      old.id,
      old.document_id,
      v_actor,
      'deleted',
      old.annotation_type,
      old.page_number,
      old.content
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_annotation_versions on public.annotations;
create trigger trg_annotation_versions
after insert or update or delete on public.annotations
for each row execute procedure public.log_annotation_version();

alter table public.annotation_versions enable row level security;

drop policy if exists "Classroom members can read annotation versions" on public.annotation_versions;
create policy "Classroom members can read annotation versions"
on public.annotation_versions for select
using (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);
