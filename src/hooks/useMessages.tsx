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

// Always poll every 2 seconds for guaranteed message delivery
const POLLING_INTERVAL = 2000;

export const useMessages = (transactionId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const isInitialMount = useRef(true);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Add message to cache with sound notification
  const addMessageToCache = useCallback((newMessage: Message) => {
    if (processedMessageIds.current.has(newMessage.id)) return false;
    processedMessageIds.current.add(newMessage.id);

    queryClient.setQueryData<Message[]>(
      ["messages", transactionId],
      (old) => {
        if (!old) return [newMessage];
        if (old.some(m => m.id === newMessage.id)) return old;
        return [...old, newMessage].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    );

    // Play sound for new messages from others
    if (newMessage.sender_id !== user?.id && !isInitialMount.current) {
      playNotificationSound();
    }
    
    return true;
  }, [transactionId, queryClient, user?.id, playNotificationSound]);

  // Polling function - fetches new messages continuously
  const pollMessages = useCallback(async () => {
    if (!transactionId) return;

    try {
      const currentMessages = queryClient.getQueryData<Message[]>(["messages", transactionId]) || [];
      const existingIds = new Set(currentMessages.map(m => m.id));
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        // Add any new messages not already in cache
        data.forEach(msg => {
          if (!existingIds.has(msg.id)) {
            addMessageToCache(msg);
          }
        });
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [transactionId, queryClient, addMessageToCache]);

  // Setup continuous polling + realtime subscription
  useEffect(() => {
    if (!transactionId) return;

    // Clear processed IDs for new transaction
    processedMessageIds.current.clear();
    isInitialMount.current = true;

    // Start polling immediately and continuously
    pollingRef.current = setInterval(pollMessages, POLLING_INTERVAL);
    console.log("📡 Chat polling started");

    // Also setup realtime for instant updates when it works
    const channel = supabase
      .channel(`chat-${transactionId}`)
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
          console.log('🔥 Chat realtime also connected');
        }
      });

    // Mark initial load complete
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      supabase.removeChannel(channel);
      clearTimeout(timer);
    };
  }, [transactionId, pollMessages, addMessageToCache]);

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
      
      // Track all initial message IDs
      (data || []).forEach(m => processedMessageIds.current.add(m.id));
      
      return data as Message[];
    },
    enabled: !!transactionId,
    staleTime: 5000,
    refetchOnWindowFocus: true,
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
    // Optimistic update - show message instantly
    onMutate: async ({ transactionId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", transactionId] });

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
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Message[]>(
        ["messages", data.transaction_id],
        (old) => {
          if (!old) return [data];
          // Remove temp messages and add real one
          const filtered = old.filter(m => !m.id.startsWith('temp-') && m.id !== data.id);
          return [...filtered, data].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
      );
    },
    onError: (error, variables, context) => {
      if (context?.optimisticMessage) {
        queryClient.setQueryData<Message[]>(
          ["messages", variables.transactionId],
          (old) => old?.filter(m => m.id !== context.optimisticMessage.id) || []
        );
      }
    },
  });
};
