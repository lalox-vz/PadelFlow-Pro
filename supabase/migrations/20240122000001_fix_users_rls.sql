-- Enable RLS updates for users
alter table public.users enable row level security;

-- Allow users to update their own profile
create policy "Users can update their own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Allow users to insert their own profile (usually handled by triggers but safe to add)
create policy "Users can insert their own profile"
on public.users for insert
with check (auth.uid() = id);
