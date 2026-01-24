-- Allow staff to create moderator rooms (transactions with moderator_id set, buyer/seller null)
DO $$
BEGIN
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'transactions'
      AND policyname = 'Staff can create moderator rooms'
  ) THEN
    CREATE POLICY "Staff can create moderator rooms"
    ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role))
      AND moderator_id = auth.uid()
      AND buyer_id IS NULL
      AND seller_id IS NULL
      AND status = 'pending'::public.transaction_status
    );
  END IF;
END $$;