-- Add "Not a Member" logic to membership_tier constraint
-- Actually, the easiest way is to drop the check constraint and recreate it allowing NULL (which is already allowed) or adding 'None'/'Not a Member'.
-- Current constraint is: CHECK (membership_tier IN ('VIP', 'Access', 'Basic'))
-- We want to allow explicit 'Not a Member' if the user requests it as an option, or we can just treat it as NULL. 
-- The user asked for "Not a Member" (or "Sin Membresía") as a 4th option.
-- Let's update the constraint to allow 'Not a Member'.

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_membership_tier_check;

ALTER TABLE public.users
ADD CONSTRAINT users_membership_tier_check 
CHECK (membership_tier IN ('VIP', 'Access', 'Basic', 'Not a Member'));

-- Also create a trigger to block bookings if membership is 'Not a Member' or NULL
-- Function to check membership before inserting registration
create or replace function public.check_membership_before_booking()
returns trigger
language plpgsql
as $$
declare
  user_tier text;
  user_expires timestamptz;
begin
  select membership_tier, membership_expires_at 
  into user_tier, user_expires
  from public.users
  where id = new.user_id;

  -- Logic: Block if tier is NULL or 'Not a Member' or if expired
  if user_tier is null or user_tier = 'Not a Member' then
    raise exception 'Membership required to book a class. Please subscribe.';
  end if;

  if user_expires is not null and user_expires < now() then
     raise exception 'Membership expired. Please renew to book.';
  end if;

  return new;
end;
$$;

-- Trigger
drop trigger if exists on_booking_check_membership on public.registrations;
create trigger on_booking_check_membership
  before insert on public.registrations
  for each row execute procedure public.check_membership_before_booking();
