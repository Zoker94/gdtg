-- Allow users to join a transaction as buyer or seller if that slot is empty
-- This enables the join room functionality to work properly
CREATE POLICY "Users can join transactions as buyer"
ON public.transactions
FOR UPDATE
USING (
  -- Only allow if buyer slot is empty
  buyer_id IS NULL
  AND status = 'pending'
  AND room_id IS NOT NULL
)
WITH CHECK (
  -- Only allow setting buyer_id to the current user
  buyer_id = auth.uid()
  AND seller_id IS NOT NULL
);

CREATE POLICY "Users can join transactions as seller"
ON public.transactions
FOR UPDATE
USING (
  -- Only allow if seller slot is empty
  seller_id IS NULL
  AND status = 'pending'
  AND room_id IS NOT NULL
)
WITH CHECK (
  -- Only allow setting seller_id to the current user
  seller_id = auth.uid()
  AND buyer_id IS NOT NULL
);