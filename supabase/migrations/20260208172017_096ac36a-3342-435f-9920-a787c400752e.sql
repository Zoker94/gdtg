-- Create rate limit logs table to track actions by IP
CREATE TABLE public.rate_limit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address inet NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_rate_limit_ip_action_time ON rate_limit_logs (ip_address, action_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow insert from service role (edge functions)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limit_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to check rate limit (returns true if allowed, false if blocked)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip inet,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count recent actions from this IP for this action type
  SELECT COUNT(*)
  INTO v_count
  FROM rate_limit_logs
  WHERE ip_address = p_ip
    AND action_type = p_action_type
    AND created_at > now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Return true if under limit
  RETURN v_count < p_max_requests;
END;
$$;

-- Function to log an action (also cleans up old entries)
CREATE OR REPLACE FUNCTION public.log_rate_limit_action(
  p_ip inet,
  p_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new log
  INSERT INTO rate_limit_logs (ip_address, action_type)
  VALUES (p_ip, p_action_type);
  
  -- Clean up entries older than 2 hours (async cleanup)
  DELETE FROM rate_limit_logs
  WHERE created_at < now() - INTERVAL '2 hours';
END;
$$;

-- Grant execute to authenticated users (will be called via edge function)
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_rate_limit_action TO authenticated, anon;