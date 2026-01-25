import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useAdjustBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, amount, note }: { userId: string; amount: number; note?: string }) => {
      const { error } = await supabase.rpc("admin_adjust_balance", {
        p_user_id: userId,
        p_amount: amount,
        p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const action = variables.amount >= 0 ? "cộng" : "trừ";
      toast({ 
        title: `Đã ${action} ${Math.abs(variables.amount).toLocaleString("vi-VN")}đ thành công!` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
