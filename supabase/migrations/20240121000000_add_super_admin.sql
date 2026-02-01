-- 1. Helper Function: is_super_admin()
-- Checks the JWT app_metadata for 'role': 'super_admin'
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return (
    select coalesce(
      raw_app_meta_data->>'role' = 'super_admin', 
      false
    )
    from auth.users
    where id = auth.uid()
  );
end;
$$;

-- 2. Update Policies
-- Strategy: We need to drop the existing policies and recreate them with the Super Admin bypass.
-- Since we know the names from the previous migration, we can drop them.

-- ORGANIZATIONS
drop policy "Users can view own organization" on public.organizations;
create policy "Users can view own organization" on public.organizations
  for select using (
    is_super_admin() or 
    id in (select organization_id from public.users where id = auth.uid())
  );

-- USERS
drop policy "Users can view members of same organization" on public.users;
create policy "Users can view members of same organization" on public.users
  for select using (
    is_super_admin() or
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

drop policy "Owners can update members" on public.users;
create policy "Owners can update members" on public.users
  for update using (
    is_super_admin() or
    (
      exists (
        select 1 from public.users me 
        where me.id = auth.uid() 
        and me.role = 'owner' 
        and me.organization_id = public.users.organization_id
      )
    )
  );

-- COURTS
drop policy "Users can view courts of their organization" on public.courts;
create policy "Users can view courts of their organization" on public.courts
  for select using (
    is_super_admin() or
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- MEMBERSHIPS
drop policy "Users can view memberships of their organization" on public.memberships;
create policy "Users can view memberships of their organization" on public.memberships
  for select using (
    is_super_admin() or
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- TRAININGS
drop policy "Users can view trainings of their organization" on public.trainings;
create policy "Users can view trainings of their organization" on public.trainings
  for select using (
    is_super_admin() or
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- REGISTRATIONS
drop policy "Users can view registrations of their organization" on public.registrations;
create policy "Users can view registrations of their organization" on public.registrations
  for select using (
    is_super_admin() or
    organization_id = (select organization_id from public.users where id = auth.uid())
  );

-- NOTIFICATIONS
drop policy "Users view own notifications" on public.notifications;
create policy "Users view own notifications" on public.notifications
  for select using (
    is_super_admin() or
    auth.uid() = user_id
  );
