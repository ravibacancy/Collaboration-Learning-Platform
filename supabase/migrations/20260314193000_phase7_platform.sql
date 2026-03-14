-- Phase 7 Platform: permissions, storage registry, templates, analytics, integration settings, document version history.

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  permission_key text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (classroom_id, user_id, permission_key)
);

create table if not exists public.file_storage (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  bucket text not null default 'documents',
  path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bucket, path)
);

create table if not exists public.version_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null,
  file_path text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, version_number)
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references public.classrooms(id) on delete cascade,
  provider text not null,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_permissions_classroom_id on public.permissions(classroom_id);
create index if not exists idx_permissions_user_id on public.permissions(user_id);
create index if not exists idx_file_storage_classroom_id on public.file_storage(classroom_id);
create index if not exists idx_file_storage_document_id on public.file_storage(document_id);
create index if not exists idx_version_history_document_id on public.version_history(document_id);
create index if not exists idx_analytics_events_classroom_id on public.analytics_events(classroom_id);
create index if not exists idx_analytics_events_document_id on public.analytics_events(document_id);
create index if not exists idx_templates_classroom_id on public.templates(classroom_id);
create index if not exists idx_integration_settings_classroom_id on public.integration_settings(classroom_id);

-- Updated at triggers

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
before update on public.templates
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_integration_settings_updated_at on public.integration_settings;
create trigger trg_integration_settings_updated_at
before update on public.integration_settings
for each row execute procedure public.set_updated_at();

alter table public.permissions enable row level security;
alter table public.file_storage enable row level security;
alter table public.version_history enable row level security;
alter table public.analytics_events enable row level security;
alter table public.templates enable row level security;
alter table public.integration_settings enable row level security;

-- Permissions policies
create policy "Members can read permissions"
on public.permissions for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers can manage permissions"
on public.permissions for insert
to authenticated
with check (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Teachers can delete permissions"
on public.permissions for delete
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

-- File storage policies
create policy "Members can read file storage"
on public.file_storage for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers can add file storage"
on public.file_storage for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

-- Version history policies
create policy "Members can read version history"
on public.version_history for select
using (
  exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers can add version history"
on public.version_history for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.documents d
    join public.classroom_members cm on cm.classroom_id = d.classroom_id
    where d.id = document_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

-- Analytics policies
create policy "Teachers can read analytics events"
on public.analytics_events for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Members can log analytics events"
on public.analytics_events for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

-- Templates policies
create policy "Members can read templates"
on public.templates for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers can manage templates"
on public.templates for insert
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

create policy "Teachers can update templates"
on public.templates for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Teachers can delete templates"
on public.templates for delete
to authenticated
using (owner_id = auth.uid());

-- Integration settings policies
create policy "Members can read integration settings"
on public.integration_settings for select
using (
  exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
  )
);

create policy "Teachers can manage integration settings"
on public.integration_settings for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.classroom_members cm
    where cm.classroom_id = classroom_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'teacher')
  )
);

create policy "Teachers can update integration settings"
on public.integration_settings for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Teachers can delete integration settings"
on public.integration_settings for delete
to authenticated
using (created_by = auth.uid());
