import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useRef, useCallback } from "react";
import { useNotificationSound } from "./useNotificationSound";

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
  const { user } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const isInitialMount = useRef(true);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Optimistic add message to cache for instant UI
  const addMessageToCache = useCallback((newMessage: Message) => {
    // Prevent duplicate messages
    if (processedMessageIds.current.has(newMessage.id)) return;
    processedMessageIds.current.add(newMessage.id);

    queryClient.setQueryData<Message[]>(
      ["messages", transactionId],
      (old) => {
        if (!old) return [newMessage];
        // Double check for duplicates in cache
        if (old.some(m => m.id === newMessage.id)) return old;
        return [...old, newMessage];
      }
    );

    // Play sound only for messages from others
    if (newMessage.sender_id !== user?.id && !isInitialMount.current) {
      playNotificationSound();
    }
  }, [transactionId, queryClient, user?.id, playNotificationSound]);

  // Set up realtime subscription - ultra fast updates
  useEffect(() => {
    if (!transactionId) return;

    // Reset processed IDs when transaction changes
    processedMessageIds.current.clear();

    const channel = supabase
      .channel(`messages-realtime-${transactionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: user?.id || 'anonymous' },
        }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          addMessageToCache(newMessage);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Chat realtime connected!');
        }
      });

    // Mark initial mount complete after messages load
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 500);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timer);
    };
  }, [transactionId, user?.id, addMessageToCache]);

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
      
      // Add all fetched IDs to processed set to prevent duplicates
      (data || []).forEach(m => processedMessageIds.current.add(m.id));
      
      return data as Message[];
    },
    enabled: !!transactionId,
    staleTime: Infinity, // Never refetch automatically - rely on realtime
    refetchOnWindowFocus: false,
    refetchOnMount: true,
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
    // Optimistic update - add message immediately before server confirms
    onMutate: async ({ transactionId, content }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages", transactionId] });

      // Optimistically add the message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        transaction_id: transactionId,
        sender_id: user?.id || '',
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", transactionId],
        (old) => old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      return { optimisticMessage };
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<Message[]>(
        ["messages", data.transaction_id],
        (old) => {
          if (!old) return [data];
          // Remove temp message and add real one (if not already added by realtime)
          const filtered = old.filter(m => !m.id.startsWith('temp-') && m.id !== data.id);
          return [...filtered, data];
        }
      );
    },
    onError: (error, variables, context) => {
      // Remove optimistic message on error
      if (context?.optimisticMessage) {
        queryClient.setQueryData<Message[]>(
          ["messages", variables.transactionId],
          (old) => old?.filter(m => m.id !== context.optimisticMessage.id) || []
        );
      }
    },
  });
};
