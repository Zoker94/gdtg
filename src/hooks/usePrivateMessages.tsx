import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  receiver_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message?: string;
  unread_count?: number;
}

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Get other user profiles
      const otherUserIds = conversations.map((c) =>
        c.user1_id === user.id ? c.user2_id : c.user1_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", otherUserIds);

      // Get last message for each conversation
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

          const { data: lastMsg } = await supabase
            .from("private_messages")
            .select("content, is_read, receiver_id")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from("private_messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", otherId)
            .eq("receiver_id", user.id)
            .eq("is_read", false);

          return {
            ...conv,
            other_user: profiles?.find((p) => p.user_id === otherId),
            last_message: lastMsg?.content,
            unread_count: count || 0,
          };
        })
      );

      return conversationsWithDetails as Conversation[];
    },
    enabled: !!user,
  });
};

export const usePrivateMessages = (otherUserId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["private-messages", user?.id, otherUserId],
    queryFn: async () => {
      if (!user || !otherUserId) return [];

      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", [user.id, otherUserId]);

      return data.map((msg) => ({
        ...msg,
        sender_profile: profiles?.find((p) => p.user_id === msg.sender_id),
        receiver_profile: profiles?.find((p) => p.user_id === msg.receiver_id),
      })) as PrivateMessage[];
    },
    enabled: !!user && !!otherUserId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });
};

export const useSendPrivateMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      receiverId,
      content,
    }: {
      receiverId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Bạn cần đăng nhập");

      // Send message
      const { data: message, error: msgError } = await supabase
        .from("private_messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Update or create conversation
      const [id1, id2] = [user.id, receiverId].sort();

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user1_id", id1)
        .eq("user2_id", id2)
        .single();

      if (existing) {
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("conversations").insert({
          user1_id: id1,
          user2_id: id2,
          last_message_at: new Date().toISOString(),
        });
      }

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["private-messages", user?.id, variables.receiverId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error("Gửi tin nhắn thất bại: " + error.message);
    },
  });
};

export const useMarkMessagesRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) return;

      await supabase
        .from("private_messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["private-messages"] });
    },
  });
};
