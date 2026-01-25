-- Create enum for KYC status
CREATE TYPE public.kyc_status AS ENUM ('none', 'pending', 'approved', 'rejected');

-- Create KYC submissions table
CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT NOT NULL,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  date_of_birth DATE,
  status kyc_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add KYC status to profiles
ALTER TABLE public.profiles ADD COLUMN kyc_status kyc_status NOT NULL DEFAULT 'none';

-- Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_submissions
CREATE POLICY "Users can view their own KYC submission"
ON public.kyc_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KYC submission"
ON public.kyc_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending KYC"
ON public.kyc_submissions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all KYC submissions"
ON public.kyc_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view all KYC submissions"
ON public.kyc_submissions
FOR SELECT
USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update KYC submissions"
ON public.kyc_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update KYC submissions"
ON public.kyc_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'moderator'));

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage policies for kyc-documents bucket
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'kyc-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view all KYC documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'kyc-documents' AND has_role(auth.uid(), 'moderator'));

-- Function to approve KYC
CREATE OR REPLACE FUNCTION public.approve_kyc(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if caller is admin or moderator
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get user_id from submission
  SELECT user_id INTO v_user_id FROM kyc_submissions WHERE id = p_submission_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;

  -- Update submission status
  UPDATE kyc_submissions 
  SET status = 'approved', reviewer_id = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_submission_id;

  -- Update profile kyc_status
  UPDATE profiles SET kyc_status = 'approved', updated_at = now() WHERE user_id = v_user_id;
END;
$$;

-- Function to reject KYC
CREATE OR REPLACE FUNCTION public.reject_kyc(p_submission_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if caller is admin or moderator
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get user_id from submission
  SELECT user_id INTO v_user_id FROM kyc_submissions WHERE id = p_submission_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;

  -- Update submission status
  UPDATE kyc_submissions 
  SET status = 'rejected', reviewer_id = auth.uid(), reviewed_at = now(), rejection_reason = p_reason, updated_at = now()
  WHERE id = p_submission_id;

  -- Update profile kyc_status
  UPDATE profiles SET kyc_status = 'rejected', updated_at = now() WHERE user_id = v_user_id;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_kyc_submissions_updated_at
BEFORE UPDATE ON public.kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();