import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

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
  const previousModeratorRef = useRef<string | null | undefined>(initialModerator);
  const previousArbiterRef = useRef<string | null | undefined>(initialArbiter);

  useEffect(() => {
    previousModeratorRef.current = initialModerator;
    previousArbiterRef.current = initialArbiter;
  }, [initialModerator, initialArbiter]);

  useEffect(() => {
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
          const newData = payload.new as {
            moderator_id?: string | null;
            arbiter_id?: string | null;
          };

          // Check if moderator just joined
          if (
            newData.moderator_id &&
            !previousModeratorRef.current &&
            newData.moderator_id !== currentUserId
          ) {
            // Fetch moderator profile
            const { data: modProfile } = await supabase
              .from("moderator_profiles")
              .select("display_name")
              .eq("user_id", newData.moderator_id)
              .single();

            toast({
              title: "👨‍💼 Quản lý viên đã tham gia",
              description: modProfile?.display_name 
                ? `${modProfile.display_name} đã vào phòng`
                : "Một quản lý viên đã vào phòng hỗ trợ",
            });
            previousModeratorRef.current = newData.moderator_id;
          }

          // Check if arbiter (admin) just joined
          if (
            newData.arbiter_id &&
            !previousArbiterRef.current &&
            newData.arbiter_id !== currentUserId
          ) {
            // Fetch admin profile
            const { data: adminProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", newData.arbiter_id)
              .single();

            toast({
              title: "🛡️ Admin đã tham gia",
              description: adminProfile?.full_name 
                ? `${adminProfile.full_name} đã vào phòng để phân xử`
                : "Một Admin đã vào phòng để phân xử",
            });
            previousArbiterRef.current = newData.arbiter_id;
          }

          // Invalidate transaction query
          queryClient.invalidateQueries({ queryKey: ["transaction", transactionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, currentUserId, queryClient]);
};
