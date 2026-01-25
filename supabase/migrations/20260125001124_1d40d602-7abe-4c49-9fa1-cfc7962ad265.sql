-- Allow Admin/Moderator to view any transaction for joining purposes
CREATE POLICY "Staff can view transactions for moderation"
ON public.transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Allow Admin/Moderator to send messages in any transaction (for moderation)
CREATE POLICY "Staff can send messages in any transaction"
ON public.messages
FOR INSERT
WITH CHECK (
  (auth.uid() = sender_id) AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

-- Allow Moderators to view all messages (for moderation purposes)
CREATE POLICY "Moderators can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'moderator'::app_role));