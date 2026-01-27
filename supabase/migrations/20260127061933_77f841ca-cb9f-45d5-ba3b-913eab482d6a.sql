-- Allow receivers to mark messages as read
CREATE POLICY "Users can mark received messages read"
ON public.private_messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
