-- Create table to store admin action logs
CREATE TABLE public.admin_action_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    action_type TEXT NOT NULL, -- 'ban', 'unban', 'freeze', 'unfreeze', 'adjust_balance', 'warning'
    details JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert logs
CREATE POLICY "Admins can view all action logs"
ON public.admin_action_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert action logs"
ON public.admin_action_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);
CREATE INDEX idx_admin_action_logs_target_user ON public.admin_action_logs(target_user_id);
CREATE INDEX idx_admin_action_logs_action_type ON public.admin_action_logs(action_type);