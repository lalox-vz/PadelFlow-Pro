-- Ensure the notification function exists and is security definer
CREATE OR REPLACE FUNCTION public.notify_admin_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  training_title text;
BEGIN
  -- Fetch names (using OLD record for cancellations)
  SELECT full_name INTO user_name FROM public.users WHERE id = OLD.user_id;
  SELECT title INTO training_title FROM public.trainings WHERE id = OLD.training_id;

  INSERT INTO public.notifications (user_id, message, type, read)
  SELECT id, 'Cancellation: ' || COALESCE(user_name, 'Unknown User') || ' cancelled ' || COALESCE(training_title, 'Unknown Class'), 'cancellation_alert', false
  FROM public.users
  WHERE role = 'admin';

  RETURN OLD;
END;
$$;

-- Drop and recreate the trigger to be sure
DROP TRIGGER IF EXISTS on_cancel_booking ON public.registrations;
CREATE TRIGGER on_cancel_booking
  AFTER DELETE ON public.registrations
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_on_cancellation();

-- Also ensure the booking trigger is correct
CREATE OR REPLACE FUNCTION public.notify_admin_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  training_title text;
BEGIN
  SELECT full_name INTO user_name FROM public.users WHERE id = NEW.user_id;
  SELECT title INTO training_title FROM public.trainings WHERE id = NEW.training_id;

  INSERT INTO public.notifications (user_id, message, type, read)
  SELECT id, 'New booking: ' || COALESCE(user_name, 'Unknown User') || ' for ' || COALESCE(training_title, 'Unknown Class'), 'booking_alert', false
  FROM public.users
  WHERE role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_booking ON public.registrations;
CREATE TRIGGER on_new_booking
  AFTER INSERT ON public.registrations
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_on_booking();
