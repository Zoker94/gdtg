import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useWithdrawalRealtime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`withdrawals-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "withdrawals",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as {
            id: string;
            status: string;
            amount: number;
            admin_note?: string | null;
          };

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["user-withdrawals"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });

          // Show toast notification based on status
          if (newData.status === "completed") {
            toast({
              title: "🎉 Rút tiền thành công!",
              description: `Yêu cầu rút ${new Intl.NumberFormat("vi-VN").format(newData.amount)}đ đã được xử lý.`,
            });
          } else if (newData.status === "rejected") {
            toast({
              title: "❌ Yêu cầu rút tiền bị từ chối",
              description: newData.admin_note || "Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
