import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  balance: number;
  reputation_score: number;
  total_transactions: number;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  warning_message: string | null;
  created_at: string;
}

// Fetch all users for admin
export const useAllUsers = () => {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    },
  });
};

// Ban user
export const useBanUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: reason,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Đã ban người dùng!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

// Unban user
export const useUnbanUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: false,
          banned_at: null,
          ban_reason: null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Đã bỏ ban người dùng!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

// Set warning
export const useSetWarning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, warning }: { userId: string; warning: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ warning_message: warning })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Đã cập nhật cảnh báo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

// Delete transaction (must delete logs first due to FK constraint)
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      // First delete related transaction logs
      const { error: logsError } = await supabase
        .from("transaction_logs")
        .delete()
        .eq("transaction_id", transactionId);
      if (logsError) throw logsError;

      // Then delete related messages
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("transaction_id", transactionId);
      if (messagesError) throw messagesError;

      // Finally delete the transaction
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transaction-logs"] });
      toast({ title: "Đã xoá giao dịch!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

// Delete deposit
export const useDeleteDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (depositId: string) => {
      const { error } = await supabase
        .from("deposits")
        .delete()
        .eq("id", depositId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      toast({ title: "Đã xoá lịch sử nạp tiền!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
