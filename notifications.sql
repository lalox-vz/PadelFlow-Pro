-- Trigger to notify Admins on new Booking (With Names)
create or replace function public.notify_admin_on_booking()
returns trigger
language plpgsql
security definer
as $$
declare
  user_name text;
  training_title text;
begin
  -- Fetch names
  select full_name into user_name from public.users where id = new.user_id;
  select title into training_title from public.trainings where id = new.training_id;

  insert into public.notifications (user_id, message, type)
  select id, 'New booking: ' || coalesce(user_name, 'Unknown User') || ' for ' || coalesce(training_title, 'Unknown Class'), 'booking_alert'
  from public.users
  where role = 'admin';
  
  return new;
end;
$$;

drop trigger if exists on_new_booking on public.registrations;
create trigger on_new_booking
  after insert on public.registrations
  for each row execute procedure public.notify_admin_on_booking();

-- Trigger to notify Admins on Cancellation (With Names)
create or replace function public.notify_admin_on_cancellation()
returns trigger
language plpgsql
security definer
as $$
declare
  user_name text;
  training_title text;
begin
  select full_name into user_name from public.users where id = old.user_id;
  select title into training_title from public.trainings where id = old.training_id;

  insert into public.notifications (user_id, message, type)
  select id, 'Cancellation: ' || coalesce(user_name, 'Unknown User') || ' from ' || coalesce(training_title, 'Unknown Class'), 'cancellation_alert'
  from public.users
  where role = 'admin';

  return old;
end;
$$;

drop trigger if exists on_cancel_booking on public.registrations;
create trigger on_cancel_booking
  after delete on public.registrations
  for each row execute procedure public.notify_admin_on_cancellation();
