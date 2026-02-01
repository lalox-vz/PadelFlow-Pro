-- FIX: RLS Policy for Notifications
-- Previously, only SELECT was allowed for users viewing their own notifications.
-- Admins need full access to INSERT notifications for other users.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Allow Admins to do EVERYTHING (Insert, Update, Delete, Select) on notifications
DROP POLICY IF EXISTS "Admins manage all notifications" ON public.notifications;
CREATE POLICY "Admins manage all notifications" ON public.notifications
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Ensure Users can still view their own (Already exists, but good to double check/ensure non-conflict)
-- The existing policy "Users view own notifications" handles the SELECT part for clients.
-- "Users view own notifications" definition: FOR SELECT USING (auth.uid() = user_id);
-- This is fine to keep.
