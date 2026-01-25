-- Create transaction_logs table for audit trail
CREATE TABLE public.transaction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'status_changed', 'buyer_joined', 'seller_joined', 'deposited', 'completed', etc.
  old_status TEXT,
  new_status TEXT,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID, -- user who performed the action
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all transaction logs"
ON public.transaction_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_transaction_logs_transaction_id ON public.transaction_logs(transaction_id);
CREATE INDEX idx_transaction_logs_created_at ON public.transaction_logs(created_at DESC);

-- Create trigger function to auto-log transaction changes
CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_note TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_note := 'Giao dịch được tạo';
    
    INSERT INTO transaction_logs (transaction_id, action, new_status, new_data, performed_by, note)
    VALUES (NEW.id, v_action, NEW.status::TEXT, to_jsonb(NEW), COALESCE(NEW.buyer_id, NEW.seller_id, NEW.moderator_id), v_note);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_changed';
      v_note := 'Trạng thái: ' || OLD.status || ' → ' || NEW.status;
      
      INSERT INTO transaction_logs (transaction_id, action, old_status, new_status, old_data, new_data, performed_by, note)
      VALUES (NEW.id, v_action, OLD.status::TEXT, NEW.status::TEXT, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_note);
    END IF;
    
    -- Log buyer joined
    IF OLD.buyer_id IS NULL AND NEW.buyer_id IS NOT NULL THEN
      INSERT INTO transaction_logs (transaction_id, action, new_data, performed_by, note)
      VALUES (NEW.id, 'buyer_joined', to_jsonb(NEW), NEW.buyer_id, 'Người mua vào phòng');
    END IF;
    
    -- Log seller joined
    IF OLD.seller_id IS NULL AND NEW.seller_id IS NOT NULL THEN
      INSERT INTO transaction_logs (transaction_id, action, new_data, performed_by, note)
      VALUES (NEW.id, 'seller_joined', to_jsonb(NEW), NEW.seller_id, 'Người bán vào phòng');
    END IF;
    
    -- Log buyer confirmed
    IF OLD.buyer_confirmed IS DISTINCT FROM NEW.buyer_confirmed AND NEW.buyer_confirmed = true THEN
      INSERT INTO transaction_logs (transaction_id, action, performed_by, note)
      VALUES (NEW.id, 'buyer_confirmed', NEW.buyer_id, 'Người mua xác nhận');
    END IF;
    
    -- Log seller confirmed
    IF OLD.seller_confirmed IS DISTINCT FROM NEW.seller_confirmed AND NEW.seller_confirmed = true THEN
      INSERT INTO transaction_logs (transaction_id, action, performed_by, note)
      VALUES (NEW.id, 'seller_confirmed', NEW.seller_id, 'Người bán xác nhận');
    END IF;
    
    -- Log dispute reason added
    IF OLD.dispute_reason IS NULL AND NEW.dispute_reason IS NOT NULL THEN
      INSERT INTO transaction_logs (transaction_id, action, new_data, performed_by, note)
      VALUES (NEW.id, 'dispute_filed', jsonb_build_object('reason', NEW.dispute_reason), auth.uid(), 'Khiếu nại: ' || NEW.dispute_reason);
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO transaction_logs (transaction_id, action, old_status, old_data, performed_by, note)
    VALUES (OLD.id, 'deleted', OLD.status::TEXT, to_jsonb(OLD), auth.uid(), 'Giao dịch bị xóa');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_log_transaction_changes
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_changes();