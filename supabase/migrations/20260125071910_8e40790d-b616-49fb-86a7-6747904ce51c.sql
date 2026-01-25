-- Add arbiter_id field to track admin who joins for arbitration (max 4 people per room)
ALTER TABLE public.transactions 
ADD COLUMN arbiter_id uuid REFERENCES auth.users(id);

-- Add comment for clarity
COMMENT ON COLUMN public.transactions.arbiter_id IS 'Admin who joins for arbitration - ensures max 4 participants (buyer, seller, moderator, arbiter)';