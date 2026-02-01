-- 1. Prevent Duplicate Registrations
-- First, clean up any existing duplicates, keeping only the most recent one (or oldest, doesn't matter much contextually, but let's keep oldest)
DELETE FROM public.registrations a USING (
      SELECT MIN(ctid) as ctid, user_id, training_id
      FROM public.registrations 
      GROUP BY user_id, training_id HAVING COUNT(*) > 1
      ) b
      WHERE a.user_id = b.user_id 
      AND a.training_id = b.training_id 
      AND a.ctid <> b.ctid;

-- Now add the unique constraint safely
ALTER TABLE public.registrations 
ADD CONSTRAINT unique_user_training UNIQUE (user_id, training_id);

-- 2. Fix Cancellation Notification Trigger
-- The previous trigger listened for DELETE, but the app performs an UPDATE to 'cancelled'.

-- Drop the old trigger and function (if they exist)
DROP TRIGGER IF EXISTS on_cancel_booking ON public.registrations;
-- We can reuse the function name but need to update its logic for UPDATE
CREATE OR REPLACE FUNCTION public.notify_admin_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  training_title text;
BEGIN
  -- Only proceed if status changed to 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    SELECT full_name INTO user_name FROM public.users WHERE id = NEW.user_id;
    SELECT title INTO training_title FROM public.trainings WHERE id = NEW.training_id;

    INSERT INTO public.notifications (user_id, message, type)
    SELECT id, 'Cancellation: ' || coalesce(user_name, 'Unknown User') || ' cancelled ' || coalesce(training_title, 'Unknown Class'), 'cancellation_alert'
    FROM public.users
    WHERE role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

-- Create the new trigger for UPDATE
CREATE TRIGGER on_cancel_booking
  AFTER UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_admin_on_cancellation();
