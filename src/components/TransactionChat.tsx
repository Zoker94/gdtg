import { useState, useRef, useEffect } from "react";
import { Send, Shield, UserCheck, ImagePlus, X, AlertTriangle } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file ảnh",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Lỗi", 
        description: "File ảnh phải nhỏ hơn 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${transactionId}/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      // Send image as message with special format
      sendMessage.mutate({
        transactionId,
        content: `[IMAGE]${urlData.publicUrl}[/IMAGE]`,
      });

      toast({ title: "Đã gửi ảnh" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải ảnh lên",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderMessageContent = (content: string) => {
    const imageMatch = content.match(/\[IMAGE\](.*?)\[\/IMAGE\]/);
    if (imageMatch) {
      const imageUrl = imageMatch[1];
      return (
        <img
          src={imageUrl}
          alt="Ảnh bằng chứng"
          className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: "200px" }}
          onClick={() => setPreviewImage(imageUrl)}
        />
      );
    }
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
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
    <>
      <div className={cn("flex flex-col h-[450px] rounded-lg border border-border bg-card", className)}>
        <div className="px-3 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">Chat giao dịch</h3>
        </div>

        {/* Evidence Warning */}
        <div className="mx-3 mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-bold leading-relaxed">
              ⚠️ LƯU Ý: Người mua hoặc bán PHẢI có hình ảnh hoặc video bằng chứng trong quá trình giao dịch. Khi có tranh chấp, Giao dịch viên sẽ xử lý dựa trên bằng chứng. Nếu KHÔNG có bằng chứng, bên đó phải TỰ CHỊU TOÀN BỘ TRÁCH NHIỆM.
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Đang tải...
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Chưa có tin nhắn nào
            </div>
          ) : (
            <div className="space-y-2">
              {messages?.map((message) => {
                const isOwn = message.sender_id === user?.id;
                const senderName = userProfiles?.[message.sender_id] || "Người dùng";
                const roleStyle = getRoleStyle(message.sender_id);
                const roleBadge = getRoleBadge(message.sender_id);

                return (
                  <div
                    key={message.id}
                    className={cn("flex flex-col max-w-[85%]", {
                      "ml-auto items-end": isOwn,
                      "mr-auto items-start": !isOwn,
                    })}
                  >
                    {/* Sender name with role badge */}
                    {!isOwn && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={cn("text-xs", roleStyle || "text-muted-foreground")}>
                          {senderName}
                        </span>
                        {roleBadge}
                      </div>
                    )}
                    <div
                      className={cn("px-2.5 py-1.5 rounded-lg", {
                        "bg-primary text-primary-foreground": isOwn,
                        "bg-muted": !isOwn,
                      })}
                    >
                      {renderMessageContent(message.content)}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(message.created_at), "HH:mm dd/MM", { locale: vi })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              className="flex-1 text-sm"
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
