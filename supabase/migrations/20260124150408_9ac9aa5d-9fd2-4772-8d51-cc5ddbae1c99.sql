-- Add new columns to transactions table for room system
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS room_id TEXT,
ADD COLUMN IF NOT EXISTS room_password TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS invite_link TEXT,
ADD COLUMN IF NOT EXISTS buyer_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_confirmed BOOLEAN DEFAULT FALSE;

-- Generate unique room_id for new transactions
CREATE OR REPLACE FUNCTION public.generate_room_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.room_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    NEW.room_password := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    NEW.invite_link := 'https://gdtg.lovable.app/join/' || NEW.room_id;
    RETURN NEW;
END;
$$;

-- Create trigger for room credentials
DROP TRIGGER IF EXISTS trigger_generate_room_credentials ON public.transactions;
CREATE TRIGGER trigger_generate_room_credentials
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_room_credentials();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);