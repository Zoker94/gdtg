import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: "pending" | "completed" | "rejected";
  admin_note: string | null;
  created_at: string;
  completed_at: string | null;
}

// Fetch all withdrawals for admin
export const useAllWithdrawals = () => {
  return useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Withdrawal[];
    },
  });
};

// Confirm withdrawal (admin)
export const useConfirmWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { error } = await supabase.rpc("confirm_withdrawal", { withdrawal_id: withdrawalId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["user-withdrawals"] });
      toast({ title: "Đã xác nhận rút tiền thành công!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

// Reject withdrawal (admin)
export const useRejectWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ withdrawalId, reason }: { withdrawalId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_withdrawal", { 
        withdrawal_id: withdrawalId, 
        reason 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["user-withdrawals"] });
      toast({ title: "Đã từ chối yêu cầu rút tiền!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

// Delete withdrawal (admin)
export const useDeleteWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { error } = await supabase
        .from("withdrawals")
        .delete()
        .eq("id", withdrawalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Đã xoá yêu cầu rút tiền!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
