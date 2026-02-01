CREATE OR REPLACE FUNCTION public.check_multiple_deposit_sources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  source_count integer;
  recent_refs text[];  -- Changed from uuid[] to text[] since transaction_ref is text
BEGIN
  -- Only check when deposit is confirmed
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- Count unique transaction references (bank sources) in last 24 hours
    SELECT COUNT(DISTINCT transaction_ref), ARRAY_AGG(DISTINCT transaction_ref)
    INTO source_count, recent_refs
    FROM public.deposits
    WHERE user_id = NEW.user_id
      AND status = 'completed'
      AND transaction_ref IS NOT NULL
      AND created_at > NOW() - INTERVAL '24 hours';
    
    -- If user has deposits from 3+ different sources in 24h, create a risk alert
    IF source_count >= 3 THEN
      INSERT INTO public.risk_alerts (user_id, alert_type, description, metadata)
      VALUES (
        NEW.user_id,
        'multiple_sources',
        'Nhận tiền từ ' || source_count || ' nguồn khác nhau trong 24h qua',
        jsonb_build_object(
          'source_count', source_count,
          'deposit_id', NEW.id,
          'amount', NEW.amount,
          'detected_at', NOW()
        )
      );
      
      -- Flag user as suspicious
      UPDATE public.profiles
      SET is_suspicious = true,
          suspicious_reason = 'Nhận tiền từ nhiều nguồn khác nhau (' || source_count || ' nguồn trong 24h)',
          suspicious_at = NOW()
      WHERE user_id = NEW.user_id
        AND is_suspicious = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;