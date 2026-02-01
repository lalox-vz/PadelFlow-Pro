# Required Database Updates

To enable the new Multi-Currency features and fix the data issue, please run the following SQL commands in your Supabase SQL Editor.

## 1. Create App Settings Table (For Exchange Rate)

This table is required for the new "Tasa de Cambio" widget to work.

```sql
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.app_settings enable row level security;

-- Allow everyone to read settings (required for users to see the daily rate)
create policy "Everyone can read settings" on public.app_settings
  for select using (true);

-- Allow admins to update settings
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

-- Insert default rate (400 Bs/$)
insert into public.app_settings (key, value)
values ('exchange_rate', '400'::jsonb)
on conflict (key) do nothing;
```

## 2. Fix the 27,000 Payment Record

A payment was incorrectly recorded as $27,000 (likely in Bs). This query converts it to USD ($67.50).

```sql
update public.payments
set amount = 67.50
where amount = 27000;
```

## 3. Verify
After running these commands, check the Dashboard. 
- You should see the "Tasa del Día" widget at the top of the "Finanzas y Balance" tab.
- The "Ingresos Totales" should no longer be skewed by the $27,000 record.
