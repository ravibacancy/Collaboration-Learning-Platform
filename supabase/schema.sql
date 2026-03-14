-- Enable required extension
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'Planning' check (status in ('Planning', 'In Progress', 'Done')),
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  due_date date,
  is_done boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New user'))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Profiles policies
drop policy if exists "Users can read profiles" on public.profiles;
create policy "Users can read profiles"
on public.profiles for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Projects policies
drop policy if exists "Anyone can read public projects" on public.projects;
create policy "Anyone can read public projects"
on public.projects for select
using (is_public = true or owner_id = auth.uid());

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
on public.projects for delete
to authenticated
using (owner_id = auth.uid());

-- Tasks policies
drop policy if exists "Read tasks from readable projects" on public.tasks;
create policy "Read tasks from readable projects"
on public.tasks for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (p.is_public = true or p.owner_id = auth.uid())
  )
);

drop policy if exists "Users can insert tasks on own projects" on public.tasks;
create policy "Users can insert tasks on own projects"
on public.tasks for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update tasks on own projects" on public.tasks;
create policy "Users can update tasks on own projects"
on public.tasks for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete tasks on own projects" on public.tasks;
create policy "Users can delete tasks on own projects"
on public.tasks for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);