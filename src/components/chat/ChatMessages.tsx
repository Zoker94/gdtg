import { useEffect, useRef, memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chatStore';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from './ChatMessage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessagesProps {
  transactionId: string;
  onImageClick: (url: string) => void;
}

// Hook to get user roles
const useUserRoles = (userIds: string[]) => {
  return useQuery({
    queryKey: ['chat-user-roles', userIds.sort().join(',')],
    queryFn: async () => {
      if (!userIds.length) return {};
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const roleMap: Record<string, 'admin' | 'moderator' | null> = {};
      data?.forEach((entry) => {
        if (entry.role === 'admin') {
          roleMap[entry.user_id] = 'admin';
        } else if (entry.role === 'moderator' && roleMap[entry.user_id] !== 'admin') {
          roleMap[entry.user_id] = 'moderator';
        }
      });
      
      return roleMap;
    },
    enabled: userIds.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });
};

// Hook to get user profiles
const useUserProfiles = (userIds: string[]) => {
  return useQuery({
    queryKey: ['chat-user-profiles', userIds.sort().join(',')],
    queryFn: async () => {
      if (!userIds.length) return {};
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const profileMap: Record<string, string> = {};
      data?.forEach((profile) => {
        profileMap[profile.user_id] = profile.full_name || 'Người dùng';
      });
      
      return profileMap;
    },
    enabled: userIds.length > 0,
    staleTime: 60000,
  });
};

export const ChatMessages = memo(({ transactionId, onImageClick }: ChatMessagesProps) => {
  const { user } = useAuth();
  const messages = useChatStore((state) => state.messages[transactionId] || []);
  const isConnected = useChatStore((state) => state.isConnected);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  // Get unique sender IDs
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const { data: userRoles } = useUserRoles(senderIds);
  const { data: userProfiles } = useUserProfiles(senderIds);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
          <span>Chưa có tin nhắn nào</span>
          {!isConnected && (
            <span className="text-xs text-yellow-500">Đang kết nối...</span>
          )}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-3" ref={scrollRef}>
      <div className="space-y-2">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwn={message.sender_id === user?.id}
            senderName={userProfiles?.[message.sender_id] || 'Người dùng'}
            role={userRoles?.[message.sender_id] || null}
            onImageClick={onImageClick}
          />
        ))}
      </div>
    </ScrollArea>
  );
});

ChatMessages.displayName = 'ChatMessages';
