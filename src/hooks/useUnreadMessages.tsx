import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useUnreadMessagesCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastNotifiedMessageId, setLastNotifiedMessageId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("private_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 10000, // Fallback polling every 10s
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("private-messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as { id: string; sender_id: string; content: string };
          
          // Avoid duplicate notifications
          if (lastNotifiedMessageId === newMessage.id) return;
          setLastNotifiedMessageId(newMessage.id);

          // Get sender profile
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", newMessage.sender_id)
            .single();

          const senderName = senderProfile?.full_name || "Người dùng";
          const previewContent = newMessage.content.length > 50 
            ? newMessage.content.substring(0, 50) + "..." 
            : newMessage.content;

          // Show toast notification
          toast.info(`Tin nhắn mới từ ${senderName}`, {
            description: previewContent,
            action: {
              label: "Xem",
              onClick: () => {
                // Will be handled by the Messages page
                window.location.href = "/messages";
              },
            },
          });

          // Invalidate query to update count
          queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, lastNotifiedMessageId]);

  return query;
};
