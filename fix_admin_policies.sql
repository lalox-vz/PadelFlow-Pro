-- 1. TRAININGS: Allow Admins to INSERT, UPDATE, DELETE
drop policy if exists "Admins can manage trainings" on public.trainings;
create policy "Admins can manage trainings" on public.trainings
  for all
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'admin'
    )
  );

-- 2. REGISTRATIONS: Allow Admins to View/Manage All
drop policy if exists "Admins can manage registrations" on public.registrations;
create policy "Admins can manage registrations" on public.registrations
  for all
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'admin'
    )
  );

-- 3. USERS: Allow Admins to View All Users (Fixes the "Only see myself" issue)
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users" on public.users
  for select
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'admin'
    )
  );

-- 4. USERS: Allow Admins to Delete Users
drop policy if exists "Admins can delete users" on public.users;
create policy "Admins can delete users" on public.users
  for delete
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'admin'
    )
  );
