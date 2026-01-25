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

// Configuration for polling fallback
const POLLING_INTERVAL = 3000; // 3 seconds fallback polling
const REALTIME_TIMEOUT = 5000; // If no realtime update in 5s, start polling

export const useMessages = (transactionId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const isInitialMount = useRef(true);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const lastRealtimeUpdate = useRef<number>(Date.now());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRealtimeActive = useRef(false);

  // Fetch messages from database
  const fetchMessages = useCallback(async () => {
    if (!transactionId) return [];

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as Message[];
  }, [transactionId]);

  // Add message to cache with duplicate prevention
  const addMessageToCache = useCallback((newMessage: Message, fromRealtime = false) => {
    if (processedMessageIds.current.has(newMessage.id)) return;
    processedMessageIds.current.add(newMessage.id);

    if (fromRealtime) {
      lastRealtimeUpdate.current = Date.now();
      isRealtimeActive.current = true;
    }

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

    // Play sound for messages from others (not during initial load)
    if (newMessage.sender_id !== user?.id && !isInitialMount.current) {
      playNotificationSound();
    }
  }, [transactionId, queryClient, user?.id, playNotificationSound]);

  // Polling fallback - fetch new messages periodically
  const pollForNewMessages = useCallback(async () => {
    if (!transactionId) return;

    try {
      const currentMessages = queryClient.getQueryData<Message[]>(["messages", transactionId]) || [];
      const lastMessageTime = currentMessages.length > 0 
        ? currentMessages[currentMessages.length - 1].created_at 
        : new Date(0).toISOString();

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("transaction_id", transactionId)
        .gt("created_at", lastMessageTime)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        data.forEach(msg => addMessageToCache(msg, false));
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [transactionId, queryClient, addMessageToCache]);

  // Start/stop polling based on realtime status
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    console.log("📡 Starting polling fallback...");
    pollingIntervalRef.current = setInterval(pollForNewMessages, POLLING_INTERVAL);
  }, [pollForNewMessages]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log("🔥 Stopping polling - realtime active");
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Monitor realtime health and toggle polling
  useEffect(() => {
    if (!transactionId) return;

    const checkRealtimeHealth = () => {
      const timeSinceLastUpdate = Date.now() - lastRealtimeUpdate.current;
      
      if (timeSinceLastUpdate > REALTIME_TIMEOUT && !pollingIntervalRef.current) {
        startPolling();
      } else if (isRealtimeActive.current && pollingIntervalRef.current) {
        stopPolling();
      }
    };

    const healthCheckInterval = setInterval(checkRealtimeHealth, 2000);

    return () => {
      clearInterval(healthCheckInterval);
      stopPolling();
    };
  }, [transactionId, startPolling, stopPolling]);

  // Realtime subscription
  useEffect(() => {
    if (!transactionId) return;

    processedMessageIds.current.clear();
    lastRealtimeUpdate.current = Date.now();
    isRealtimeActive.current = false;

    const channel = supabase
      .channel(`messages-realtime-${transactionId}`, {
        config: {
          broadcast: { self: true },
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
          addMessageToCache(newMessage, true);
          
          // Stop polling since realtime is working
          if (pollingIntervalRef.current) {
            stopPolling();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔥 Chat realtime connected!');
          isRealtimeActive.current = true;
          lastRealtimeUpdate.current = Date.now();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('⚠️ Realtime issue, activating polling...');
          isRealtimeActive.current = false;
          startPolling();
        }
      });

    // Initial load complete after delay
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 500);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timer);
      stopPolling();
    };
  }, [transactionId, addMessageToCache, startPolling, stopPolling]);

  return useQuery({
    queryKey: ["messages", transactionId],
    queryFn: async () => {
      const messages = await fetchMessages();
      messages.forEach(m => processedMessageIds.current.add(m.id));
      return messages;
    },
    enabled: !!transactionId,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
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
    // Optimistic update - instant UI feedback
    onMutate: async ({ transactionId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", transactionId] });

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      queryClient.setQueryData<Message[]>(
        ["messages", data.transaction_id],
        (old) => {
          if (!old) return [data];
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
