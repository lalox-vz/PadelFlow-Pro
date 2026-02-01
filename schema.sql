-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE (extends auth.users)
-- Note: Trigger to handle new user signup is recommended but for now we'll create the table
create table public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  email text,
  phone text,
  role text check (role in ('admin', 'client')) default 'client',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- TRAININGS TABLE
create table public.trainings (
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

-- REGISTRATIONS TABLE
create table public.registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  training_id uuid references public.trainings(id) not null,
  status text check (status in ('confirmed', 'cancelled', 'waitlist')) default 'confirmed',
  created_at timestamptz default now()
);

-- NOTIFICATIONS TABLE
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  message text not null,
  sent_at timestamptz default now(),
  type text -- 'whatsapp', 'email'
);

-- POLICIES (Basic)
-- Users can view their own profile
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Public read access for trainings (schedule is public)
create policy "Trainings are public" on public.trainings
  for select using (true);

-- Admin write access (TODO: Create a secure way to assign admin, for now manual)
-- Assume a specific admin email or manual role assignment in DB
