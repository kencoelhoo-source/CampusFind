DROP POLICY IF EXISTS "Users can create notifications for others"
ON public.notifications;

CREATE POLICY "Users can create own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);