import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore, Message } from '@/stores/chatStore';
import { useAuth } from './useAuth';

// Audio context for notification sound
let audioContext: AudioContext | null = null;

const playNotificationSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    const now = audioContext.currentTime;
    
    // First note - G5 (784 Hz)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 784;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.start(now);
    osc1.stop(now + 0.15);
    
    // Second note - B5 (988 Hz)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.value = 988;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.25);
  } catch (error) {
    console.log('Audio not available');
  }
};

export const useChatRealtime = (transactionId: string | undefined) => {
  const { user } = useAuth();
  const { addMessage, setMessages, setConnected } = useChatStore();
  const isInitialLoad = useRef(true);
  const processedIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!transactionId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const messages = data.map(m => ({ ...m, status: 'sent' as const }));
      setMessages(transactionId, messages);
      
      // Track all fetched IDs
      data.forEach(m => processedIds.current.add(m.id));
      
      // Mark initial load complete after short delay
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 300);
    }
  }, [transactionId, setMessages]);

  // Handle incoming realtime message
  const handleRealtimeMessage = useCallback((payload: { new: Message }) => {
    if (!transactionId) return;
    
    const newMessage = { ...payload.new, status: 'sent' as const };
    
    // Skip if already processed
    if (processedIds.current.has(newMessage.id)) return;
    processedIds.current.add(newMessage.id);
    
    // Add to store immediately
    addMessage(transactionId, newMessage);
    
    // Play sound for messages from others (not during initial load)
    if (newMessage.sender_id !== user?.id && !isInitialLoad.current) {
      playNotificationSound();
    }
  }, [transactionId, addMessage, user?.id]);

  // Setup realtime subscription
  useEffect(() => {
    if (!transactionId) return;

    // Reset state for new transaction
    processedIds.current.clear();
    isInitialLoad.current = true;

    // Fetch initial messages
    fetchMessages();

    // Create realtime channel with optimized config
    const channel = supabase
      .channel(`chat-${transactionId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `transaction_id=eq.${transactionId}`,
        },
        handleRealtimeMessage
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('🔥 Chat realtime connected!');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConnected(false);
    };
  }, [transactionId, fetchMessages, handleRealtimeMessage, setConnected]);
};

export const useSendChatMessage = () => {
  const { user } = useAuth();
  const { addMessage, updateMessage, removeMessage } = useChatStore();

  const sendMessage = useCallback(async (
    transactionId: string,
    content: string
  ) => {
    if (!user?.id || !content.trim()) return;

    // Create optimistic message with temp ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      transaction_id: transactionId,
      sender_id: user.id,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    // Add to store immediately (instant UI update)
    addMessage(transactionId, optimisticMessage);

    try {
      // Send to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          transaction_id: transactionId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      updateMessage(transactionId, tempId, data);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as error or remove
      removeMessage(transactionId, tempId);
      throw error;
    }
  }, [user?.id, addMessage, updateMessage, removeMessage]);

  return { sendMessage };
};
