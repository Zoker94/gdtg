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
  is_balance_frozen: boolean;
  balance_frozen_at: string | null;
  balance_freeze_reason: string | null;
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

// Delete transaction (CASCADE will auto-delete related logs and messages)
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      // Just delete the transaction - CASCADE will handle logs and messages
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

// Freeze balance
export const useFreezeBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, freeze, reason }: { userId: string; freeze: boolean; reason?: string }) => {
      const { error } = await supabase.rpc("admin_freeze_balance", {
        p_user_id: userId,
        p_freeze: freeze,
        p_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ 
        title: variables.freeze ? "Đã đóng băng số dư!" : "Đã gỡ đóng băng số dư!" 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
