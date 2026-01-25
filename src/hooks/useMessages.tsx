import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export interface Message {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export const useMessages = (transactionId: string | undefined) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription with immediate cache update
  useEffect(() => {
    if (!transactionId) return;

    const channel = supabase
      .channel(`messages-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          // Immediately add new message to cache for instant UI update
          const newMessage = payload.new as Message;
          queryClient.setQueryData<Message[]>(
            ["messages", transactionId],
            (old) => old ? [...old, newMessage] : [newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, queryClient]);

  return useQuery({
    queryKey: ["messages", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!transactionId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      transactionId,
      content,
    }: {
      transactionId: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          transaction_id: transactionId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", data.transaction_id] });
    },
  });
};
