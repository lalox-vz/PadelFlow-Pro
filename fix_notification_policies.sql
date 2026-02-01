-- Enable RLS on Notifications (ensure it is enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
