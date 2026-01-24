import { useState, useRef, useEffect } from "react";
import { Send, Shield, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface TransactionChatProps {
  transactionId: string;
  className?: string;
}

// Hook to get user roles
const useUserRoles = (userIds: string[]) => {
  return useQuery({
    queryKey: ["user-roles", userIds],
    queryFn: async () => {
      if (!userIds.length) return {};
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      
      if (error) throw error;
      
      // Create a map of user_id to their highest role (admin > moderator > user)
      const roleMap: Record<string, "admin" | "moderator" | null> = {};
      data?.forEach((entry) => {
        const currentRole = roleMap[entry.user_id];
        if (entry.role === "admin") {
          roleMap[entry.user_id] = "admin";
        } else if (entry.role === "moderator" && currentRole !== "admin") {
          roleMap[entry.user_id] = "moderator";
        }
      });
      
      return roleMap;
    },
    enabled: userIds.length > 0,
  });
};

// Hook to get user profiles for display names
const useUserProfiles = (userIds: string[]) => {
  return useQuery({
    queryKey: ["user-profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return {};
      
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      if (error) throw error;
      
      const profileMap: Record<string, string> = {};
      data?.forEach((profile) => {
        profileMap[profile.user_id] = profile.full_name || "Người dùng";
      });
      
      return profileMap;
    },
    enabled: userIds.length > 0,
  });
};

export const TransactionChat = ({ transactionId, className }: TransactionChatProps) => {
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(transactionId);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const notifiedUsersRef = useRef<Set<string>>(new Set());

  // Get unique sender IDs
  const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
  const { data: userRoles } = useUserRoles(senderIds);
  const { data: userProfiles } = useUserProfiles(senderIds);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify when admin/moderator joins (sends first message)
  useEffect(() => {
    if (!messages || !userRoles || !userProfiles) return;

    messages.forEach((message) => {
      const senderId = message.sender_id;
      const role = userRoles[senderId];
      
      // Only notify for admin or moderator, and only once per user
      if (role && !notifiedUsersRef.current.has(senderId) && senderId !== user?.id) {
        notifiedUsersRef.current.add(senderId);
        
        const displayName = userProfiles[senderId] || "Người dùng";
        const roleLabel = role === "admin" ? "Quản trị viên" : "Giao dịch viên";
        const roleColor = role === "admin" ? "text-red-500" : "text-pink-500";
        
        toast({
          title: `${roleLabel} đã tham gia`,
          description: (
            <span>
              <span className={roleColor}>{displayName}</span> đã vào phòng giao dịch
            </span>
          ) as unknown as string,
        });
      }
    });
  }, [messages, userRoles, userProfiles, user?.id]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    sendMessage.mutate({
      transactionId,
      content: newMessage.trim(),
    });
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleStyle = (senderId: string) => {
    const role = userRoles?.[senderId];
    if (role === "admin") return "text-red-500 font-semibold";
    if (role === "moderator") return "text-pink-500 font-semibold";
    return "";
  };

  const getRoleBadge = (senderId: string) => {
    const role = userRoles?.[senderId];
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (role === "moderator") {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
          <UserCheck className="w-3 h-3" />
          GDV
        </span>
      );
    }
    return null;
  };

  return (
    <div className={cn("flex flex-col h-[400px] rounded-lg border border-border bg-card", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold">Chat giao dịch</h3>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Đang tải...
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Chưa có tin nhắn nào
          </div>
        ) : (
          <div className="space-y-3">
            {messages?.map((message) => {
              const isOwn = message.sender_id === user?.id;
              const senderName = userProfiles?.[message.sender_id] || "Người dùng";
              const roleStyle = getRoleStyle(message.sender_id);
              const roleBadge = getRoleBadge(message.sender_id);

              return (
                <div
                  key={message.id}
                  className={cn("flex flex-col max-w-[80%]", {
                    "ml-auto items-end": isOwn,
                    "mr-auto items-start": !isOwn,
                  })}
                >
                  {/* Sender name with role badge */}
                  {!isOwn && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn("text-xs", roleStyle || "text-muted-foreground")}>
                        {senderName}
                      </span>
                      {roleBadge}
                    </div>
                  )}
                  <div
                    className={cn("px-3 py-2 rounded-lg", {
                      "bg-primary text-primary-foreground": isOwn,
                      "bg-muted": !isOwn,
                    })}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(message.created_at), "HH:mm dd/MM", { locale: vi })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
