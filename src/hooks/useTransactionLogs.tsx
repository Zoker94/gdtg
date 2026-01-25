import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TransactionLog {
  id: string;
  transaction_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  performed_by: string | null;
  note: string | null;
  created_at: string;
}

export const useTransactionLogs = (transactionId?: string) => {
  return useQuery({
    queryKey: ["transaction-logs", transactionId],
    queryFn: async () => {
      let query = supabase
        .from("transaction_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (transactionId) {
        query = query.eq("transaction_id", transactionId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as TransactionLog[];
    },
  });
};

export const useAllTransactionLogs = () => {
  return useQuery({
    queryKey: ["all-transaction-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as TransactionLog[];
    },
  });
};
