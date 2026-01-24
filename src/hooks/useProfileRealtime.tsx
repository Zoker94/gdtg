import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";
import { Profile } from "./useProfile";

export const useProfileRealtime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Get initial balance for comparison
    const currentProfile = queryClient.getQueryData<Profile>(["profile", user.id]);
    if (currentProfile) {
      previousBalanceRef.current = currentProfile.balance;
    }

    const channel = supabase
      .channel(`profile-realtime-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          const previousBalance = previousBalanceRef.current;

          // Immediately update cache for instant UI update
          queryClient.setQueryData(["profile", user.id], newProfile);
          
          // Invalidate to ensure consistency
          queryClient.invalidateQueries({ queryKey: ["profile", user.id] });

          // Show toast notification for balance changes
          if (previousBalance !== null && newProfile.balance !== previousBalance) {
            const difference = newProfile.balance - previousBalance;
            const formattedAmount = new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(Math.abs(difference));

            if (difference > 0) {
              toast({
                title: "💰 Số dư tăng!",
                description: `+${formattedAmount} đã được cộng vào tài khoản`,
              });
            } else if (difference < 0) {
              toast({
                title: "💸 Số dư giảm",
                description: `-${formattedAmount} đã được trừ từ tài khoản`,
              });
            }
          }

          // Update the reference for next comparison
          previousBalanceRef.current = newProfile.balance;
        }
      )
      .subscribe((status) => {
        console.log(`Profile realtime subscription status for user ${user.id}:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};
