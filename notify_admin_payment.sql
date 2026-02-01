-- Trigger to notify Admins on New Payment Upload
create or replace function public.notify_admin_on_payment()
returns trigger
language plpgsql
security definer
as $$
declare
  user_name text;
begin
  -- Fetch user name
  select full_name into user_name from public.users where id = new.user_id;

  -- Insert notification for all admins
  insert into public.notifications (user_id, message, type)
  select id, 'New payment uploaded by ' || coalesce(user_name, 'Unknown User') || ' ($' || new.amount || ')', 'payment_alert'
  from public.users
  where role = 'admin';
  
  return new;
end;
$$;

drop trigger if exists on_new_payment on public.payments;
create trigger on_new_payment
  after insert on public.payments
  for each row execute procedure public.notify_admin_on_payment();
