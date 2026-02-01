-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  email text,
  phone text,
  role text check (role in ('admin', 'client')) default 'client',
  created_at timestamptz default now()
);

-- Enable RLS on Users
alter table public.users enable row level security;

-- Policies for Users
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Enable insert for authenticated users only" on public.users;
create policy "Enable insert for authenticated users only" on public.users 
  for insert with check (auth.uid() = id);


-- 2. TRAININGS TABLE (New name, replacing 'classes')
create table if not exists public.trainings (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity int default 20,
  instructor text,
  type text, -- 'Yoga', 'Functional', 'Hyrox', etc.
  created_at timestamptz default now()
);

-- Enable RLS on Trainings
alter table public.trainings enable row level security;

-- Policies for Trainings
drop policy if exists "Trainings are public" on public.trainings;
create policy "Trainings are public" on public.trainings
  for select using (true);
drop policy if exists "Classes are public" on public.trainings; -- Cleanup old policy name if it exists


-- 3. REGISTRATIONS TABLE
create table if not exists public.registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  training_id uuid references public.trainings(id) not null,
  status text check (status in ('confirmed', 'cancelled', 'waitlist')) default 'confirmed',
  created_at timestamptz default now()
);

-- Enable RLS on Registrations
alter table public.registrations enable row level security;

-- Policies for Registrations
drop policy if exists "Users can view own registrations" on public.registrations;
create policy "Users can view own registrations" on public.registrations
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create own registrations" on public.registrations;
create policy "Users can create own registrations" on public.registrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own registrations" on public.registrations;
create policy "Users can update own registrations" on public.registrations
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own registrations" on public.registrations;
create policy "Users can delete own registrations" on public.registrations
  for delete using (auth.uid() = user_id);


-- 4. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null, -- The recipient (can be admin or user)
  message text not null,
  sent_at timestamptz default now(),
  type text, -- 'booking_alert', 'cancellation_alert', etc.
  read boolean default false
);

-- Enable RLS on Notifications
alter table public.notifications enable row level security;

-- Policies for Notifications
drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications" on public.notifications
  for select using (auth.uid() = user_id);


-- 5. AUTOMATION: User Creation Trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'client')
  on conflict (id) do nothing; -- Prevent error if user already exists
  return new;
end;
$$;

-- Drop trigger if exists to ensure clean slate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. BACKFILL (Safe to run multiple times)
insert into public.users (id, email, full_name, role)
select id, email, raw_user_meta_data ->> 'full_name', 'client'
from auth.users
where id not in (select id from public.users);

