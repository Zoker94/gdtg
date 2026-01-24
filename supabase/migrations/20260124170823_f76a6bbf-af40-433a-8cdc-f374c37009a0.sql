-- Allow users to find rooms by room_id for joining
-- This is needed so users can search for a room before becoming buyer/seller
CREATE POLICY "Users can find rooms by room_id"
ON public.transactions
FOR SELECT
USING (
  -- Allow if looking up by room_id (for joining)
  room_id IS NOT NULL
  AND status NOT IN ('completed', 'cancelled', 'refunded')
);