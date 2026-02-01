-- Rename table
ALTER TABLE public.classes RENAME TO trainings;

-- Rename column in registrations
ALTER TABLE public.registrations RENAME COLUMN class_id TO training_id;

-- Update foreign key constraint in registrations (if named automatically, it might be independent, but good to check)
-- Dropping old constraint if it exists (generic name assumption, or we just rely on the column rename if cascade handles it, but usually FKs need explicit handling if named)
-- For Supabase/Postgres, renaming the column usually updates the reference, but let's be safe and ensure the constraint points to the new table name if we re-defined it.
-- However, renaming the table `classes` to `trainings` keeps the OID, so the FK `registrations.class_id` -> `classes.id` stays valid.
-- When we rename `registrations.class_id` to `registrations.training_id`, it also stays valid.
-- We might want to rename the constraint itself for clarity, but it's optional.

-- RENAME TABLE (Already done in previous step, confirming id)
ALTER TABLE IF EXISTS public.classes RENAME TO trainings;
ALTER TABLE IF EXISTS public.registrations RENAME COLUMN class_id TO training_id;

-- 1. FIX: Enable RLS Allow Insert for public.users (Client-side fallback)
CREATE POLICY "Enable insert for authenticated users only" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. FIX: Robust User Creation Trigger (Server-side reliability)
-- Function to handle new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'client');
  return new;
end;
$$;

-- Trigger to call function on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. FIX: Backfill missing users (if any exist in auth but not public)
insert into public.users (id, email, full_name, role)
select id, email, raw_user_meta_data ->> 'full_name', 'client'
from auth.users
where id not in (select id from public.users);

-- Update RLS Policies
-- "Classes are public" policy needs to be dropped and prevented or renamed?
-- Renaming the table carries over the policies. 
-- "Classes are public" will still exist on "trainings".
-- We can rename the policy for clarity:
ALTER POLICY "Classes are public" ON public.trainings RENAME TO "Trainings are public";
