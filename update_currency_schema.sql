-- 1. Create App Settings table to store global configuration like 'exchange_rate'
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.app_settings enable row level security;

-- Policies
-- Everyone can read settings
create policy "Everyone can read settings" on public.app_settings
  for select using (true);

-- Only admins can update (assuming admin check involves checking public.users role)
create policy "Admins can update settings" on public.app_settings
  for update using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'admin'
    )
  );

create policy "Admins can insert settings" on public.app_settings
  for insert with check (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'admin'
    )
  );


-- 2. Insert default exchange rate if not exists
insert into public.app_settings (key, value)
values ('exchange_rate', '400'::jsonb)
on conflict (key) do nothing;


-- 3. Fix the 27,000 payment record (Backup SQL if script fails)
update public.payments
set amount = 67.50
where amount = 27000;
