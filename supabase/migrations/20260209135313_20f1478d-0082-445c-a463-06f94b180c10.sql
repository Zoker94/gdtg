
-- Table to store user's active profile theme selections
CREATE TABLE public.profile_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  gradient_id TEXT DEFAULT 'default',
  frame_id TEXT DEFAULT 'default',
  effect_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_themes ENABLE ROW LEVEL SECURITY;

-- Everyone can view profile themes (so visitors see the styled profile)
CREATE POLICY "Anyone can view profile themes"
ON public.profile_themes
FOR SELECT
USING (true);

-- Only the user can update their own theme
CREATE POLICY "Users can insert their own theme"
ON public.profile_themes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme"
ON public.profile_themes
FOR UPDATE
USING (auth.uid() = user_id);
