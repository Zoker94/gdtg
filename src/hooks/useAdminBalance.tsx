import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLogAdminAction } from "@/hooks/useAdminActionLogs";

export const useAdjustBalance = () => {
  const queryClient = useQueryClient();
  const logAction = useLogAdminAction();

  return useMutation({
    mutationFn: async ({ userId, amount, note }: { userId: string; amount: number; note?: string }) => {
      const { error } = await supabase.rpc("admin_adjust_balance", {
        p_user_id: userId,
        p_amount: amount,
        p_note: note || null,
      });
      if (error) throw error;
      return { userId, amount, note };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      logAction.mutate({
        targetUserId: data.userId,
        actionType: "adjust_balance",
        details: { amount: data.amount },
        note: data.note,
      });
      const action = data.amount >= 0 ? "cộng" : "trừ";
      toast({ 
        title: `Đã ${action} ${Math.abs(data.amount).toLocaleString("vi-VN")}đ thành công!` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
