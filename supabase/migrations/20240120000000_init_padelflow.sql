-- CLEANUP: Drop existing tables to ensure a fresh start
drop table if exists public.registrations cascade;
drop table if exists public.trainings cascade;
drop table if exists public.memberships cascade;
drop table if exists public.courts cascade;
drop table if exists public.notifications cascade;
drop table if exists public.users cascade;
drop table if exists public.organizations cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. CREATE TABLES
-- ==========================================

-- 1.1 ORGANIZATIONS
create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo_url text,
  location text,
  total_courts integer default 1,
  opening_time time default '08:00',
  closing_time time default '22:00',
  created_at timestamptz default now()
);

-- 1.2 USERS (Profiles)
create table public.users (
  id uuid references auth.users not null primary key,
  organization_id uuid references public.organizations(id),
  full_name text,
  email text,
  phone text,
  role text check (role in ('owner', 'coach', 'student')) default 'student',
  created_at timestamptz default now()
);

-- 1.3 COURTS
create table public.courts (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  court_name text not null,
  surface_type text check (surface_type in ('indoor', 'outdoor', 'panoramic')) default 'outdoor',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 1.4 MEMBERSHIPS (Credits System)
create table public.memberships (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) not null,
  organization_id uuid references public.organizations(id) not null,
  class_credits integer default 0,
  created_at timestamptz default now()
);

-- 1.5 TRAININGS / CLASSES
create table public.trainings (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  court_id uuid references public.courts(id),
  capacity int default 4,
  instructor_id uuid references public.users(id),
  type text,
  created_at timestamptz default now()
);

-- 1.6 REGISTRATIONS
create table public.registrations (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  user_id uuid references public.users(id) not null,
  training_id uuid references public.trainings(id) not null,
  status text check (status in ('confirmed', 'cancelled', 'waitlist')) default 'confirmed',
  created_at timestamptz default now()
);

-- 1.7 NOTIFICATIONS
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  user_id uuid references public.users(id) not null,
  message text not null,
  sent_at timestamptz default now(),
  type text, 
  read boolean default false
);

-- ==========================================
-- 2. ENABLE RLS
-- ==========================================

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.courts enable row level security;
alter table public.memberships enable row level security;
alter table public.trainings enable row level security;
alter table public.registrations enable row level security;
alter table public.notifications enable row level security;

-- ==========================================
-- 3. POLICIES
-- ==========================================

-- 3.1 ORGANIZATIONS POLICIES
-- Authenticated users can create an organization (for onboarding)
create policy "Enable insert for authenticated users" on public.organizations
  for insert with check (auth.role() = 'authenticated');

-- Users can view their own organization
create policy "Users can view own organization" on public.organizations
  for select using (
    id in (select organization_id from public.users where id = auth.uid())
  );

-- 3.2 USERS POLICIES
-- Users can view members of their same organization
create policy "Users can view members of same organization" on public.users
  for select using (
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- Users can update their own profile
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Owners can update users in their organization
create policy "Owners can update members" on public.users
  for update using (
    exists (
      select 1 from public.users me 
      where me.id = auth.uid() 
      and me.role = 'owner' 
      and me.organization_id = public.users.organization_id
    )
  );

-- 3.3 COURTS POLICIES
create policy "Users can view courts of their organization" on public.courts
  for select using (
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- 3.4 MEMBERSHIPS POLICIES
create policy "Users can view memberships of their organization" on public.memberships
  for select using (
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- 3.5 TRAININGS POLICIES
create policy "Users can view trainings of their organization" on public.trainings
  for select using (
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- 3.6 REGISTRATIONS POLICIES
create policy "Users can view registrations of their organization" on public.registrations
  for select using (
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- 3.7 NOTIFICATIONS POLICIES
create policy "Users view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

-- ==========================================
-- 4. TRIGGERS
-- ==========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, organization_id)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name', 
    'student', -- Default role
    (new.raw_user_meta_data ->> 'organization_id')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
