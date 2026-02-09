
-- Create banned_ips table
CREATE TABLE public.banned_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address inet NOT NULL,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(ip_address)
);

-- Enable RLS
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage banned IPs
CREATE POLICY "Admins can view banned IPs"
  ON public.banned_ips FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert banned IPs"
  ON public.banned_ips FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banned IPs"
  ON public.banned_ips FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banned IPs"
  ON public.banned_ips FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if an IP is banned (callable by edge functions with service role)
CREATE OR REPLACE FUNCTION public.is_ip_banned(p_ip inet)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM banned_ips
    WHERE ip_address = p_ip
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Index for fast lookups
CREATE INDEX idx_banned_ips_active ON public.banned_ips(ip_address) WHERE is_active = true;
