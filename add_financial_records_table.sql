-- Create financial_records table
create table if not exists public.financial_records (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('income', 'expense')) not null,
  amount numeric not null,
  category text not null, -- e.g., 'Rent', 'Coach Salary', 'Equipment', etc.
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.financial_records enable row level security;

-- Policies
-- Admins can do everything
create policy "Admins can view all financial records" on public.financial_records
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert financial records" on public.financial_records
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update financial records" on public.financial_records
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete financial records" on public.financial_records
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
