-- Phase 4 Integrations: LMS connections and cloud document sources.
-- Run after supabase/schema.sql, supabase/phase1_foundation.sql, supabase/phase3_collaboration.sql, supabase/phase4_reliability.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'integration_provider'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.integration_provider AS ENUM ('google_classroom', 'canvas', 'schoology', 'microsoft_teams');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'connection_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.connection_status AS ENUM ('pending', 'connected', 'error');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cloud_provider'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.cloud_provider AS ENUM ('google_drive', 'onedrive', 'dropbox', 'box', 'url');
  END IF;
END $$;

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  provider public.integration_provider not null,
  status public.connection_status not null default 'connected',
  external_class_id text,
  display_name text,
  connected_by uuid references auth.users(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_integration_connections_classroom on public.integration_connections(classroom_id);
create index if not exists idx_integration_connections_provider on public.integration_connections(provider);

drop trigger if exists trg_integration_connections_updated_at on public.integration_connections;
create trigger trg_integration_connections_updated_at
before update on public.integration_connections
for each row execute procedure public.set_updated_at();

create table if not exists public.document_sources (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  provider public.cloud_provider not null default 'url',
  source_url text not null,
  external_id text,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_document_sources_document on public.document_sources(document_id);
create index if not exists idx_document_sources_provider on public.document_sources(provider);

alter table public.integration_connections enable row level security;
alter table public.document_sources enable row level security;

drop policy if exists "Classroom members can read integrations" on public.integration_connections;
create policy "Classroom members can read integrations"
on public.integration_connections for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Teachers and owners can manage integrations" on public.integration_connections;
create policy "Teachers and owners can manage integrations"
on public.integration_connections for all
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

drop policy if exists "Classroom members can read document sources" on public.document_sources;
create policy "Classroom members can read document sources"
on public.document_sources for select
using (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Teachers and owners can manage document sources" on public.document_sources;
create policy "Teachers and owners can manage document sources"
on public.document_sources for all
to authenticated
using (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);
