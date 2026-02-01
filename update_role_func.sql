-- Function to allow Admins to update user roles
-- This updates both the public profile and the auth metadata
create or replace function public.update_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the *caller* is an admin
  if not exists (
    select 1 from public.users 
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: Only admins can change roles.';
  end if;

  -- Update public profile
  update public.users
  set role = new_role
  where id = target_user_id;

  -- Update auth metadata
  update auth.users
  set raw_user_meta_data = 
    jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(new_role)
    )
  where id = target_user_id;
end;
$$;

-- Grant execute permission to authenticated users (logic inside handles actual authz)
grant execute on function public.update_user_role to authenticated;
