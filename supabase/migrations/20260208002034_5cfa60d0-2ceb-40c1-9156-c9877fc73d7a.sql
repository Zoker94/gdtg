-- Create table for user ratings/reviews
CREATE TABLE public.user_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, rater_id)
);

-- Enable RLS
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view ratings (public)
CREATE POLICY "Anyone can view ratings"
ON public.user_ratings
FOR SELECT
USING (true);

-- Users can create ratings for completed transactions they participated in
CREATE POLICY "Users can create ratings for their completed transactions"
ON public.user_ratings
FOR INSERT
WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_id
    AND t.status = 'completed'
    AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    AND (
      (t.buyer_id = auth.uid() AND rated_user_id = t.seller_id) OR
      (t.seller_id = auth.uid() AND rated_user_id = t.buyer_id)
    )
  )
);

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
ON public.user_ratings
FOR UPDATE
USING (auth.uid() = rater_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
ON public.user_ratings
FOR DELETE
USING (auth.uid() = rater_id);

-- Create index for faster queries
CREATE INDEX idx_user_ratings_rated_user ON public.user_ratings(rated_user_id);
CREATE INDEX idx_user_ratings_transaction ON public.user_ratings(transaction_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_ratings_updated_at
BEFORE UPDATE ON public.user_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();