import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Transaction } from "@/hooks/useTransactions";

interface ParticipantsRealtimeConfig {
  transactionId: string;
  currentUserId?: string;
  initialModerator?: string | null;
  initialArbiter?: string | null;
}

export const useParticipantsRealtime = ({
  transactionId,
  currentUserId,
  initialModerator,
  initialArbiter,
}: ParticipantsRealtimeConfig) => {
  const queryClient = useQueryClient();
  const notifiedRef = useRef<Set<string>>(new Set());

  // Track already-present staff to prevent duplicate notifications
  useEffect(() => {
    if (initialModerator) notifiedRef.current.add(initialModerator);
    if (initialArbiter) notifiedRef.current.add(initialArbiter);
  }, [initialModerator, initialArbiter]);

  useEffect(() => {
    if (!transactionId) return;

    const channel = supabase
      .channel(`participants-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transactionId}`,
        },
        async (payload) => {
          const newData = payload.new as Partial<Transaction>;

          // Immediately update cache for instant UI response
          queryClient.setQueryData<Transaction>(
            ["transaction", transactionId],
            (old) => old ? { ...old, ...newData } : old
          );

          // Check if moderator just joined (and not already notified)
          if (
            newData.moderator_id &&
            newData.moderator_id !== currentUserId &&
            !notifiedRef.current.has(newData.moderator_id)
          ) {
            notifiedRef.current.add(newData.moderator_id);
            
            // Fetch moderator name
            const { data: modProfile } = await supabase
              .from("moderator_profiles")
              .select("display_name")
              .eq("user_id", newData.moderator_id)
              .maybeSingle();

            toast({
              title: "🎯 Giao dịch viên đã tham gia",
              description: modProfile?.display_name || "GDV đã vào phòng để hỗ trợ",
            });
          }

          // Check if arbiter (admin) just joined
          if (
            newData.arbiter_id &&
            newData.arbiter_id !== currentUserId &&
            !notifiedRef.current.has(newData.arbiter_id)
          ) {
            notifiedRef.current.add(newData.arbiter_id);
            
            // Fetch admin name
            const { data: adminProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", newData.arbiter_id)
              .maybeSingle();

            toast({
              title: "🛡️ Admin đã tham gia",
              description: adminProfile?.full_name || "Admin đã vào phòng để phán xử",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, currentUserId, queryClient]);
};
