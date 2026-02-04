-- Add social profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS zalo_contact text,
ADD COLUMN IF NOT EXISTS bio text;