import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  usePrivateMessages,
  useSendPrivateMessage,
  useMarkMessagesRead,
} from "@/hooks/usePrivateMessages";
import { cn } from "@/lib/utils";

interface PrivateMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string | null;
}

const PrivateMessageDialog = ({
  open,
  onOpenChange,
  otherUserId,
  otherUserName,
  otherUserAvatar,
}: PrivateMessageDialogProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = usePrivateMessages(open ? otherUserId : null);
  const sendMessage = useSendPrivateMessage();
  const markRead = useMarkMessagesRead();

  // Mark messages as read when opening
  useEffect(() => {
    if (open && otherUserId) {
      markRead.mutate(otherUserId);
    }
  }, [open, otherUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;

    await sendMessage.mutateAsync({
      receiverId: otherUserId,
      content: message.trim(),
    });
    setMessage("");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUserAvatar || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(otherUserName)}
              </AvatarFallback>
            </Avatar>
            <span>{otherUserName}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Bắt đầu cuộc trò chuyện với {otherUserName}
            </div>
          ) : (
            <div className="space-y-3">
              {messages?.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isMine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border flex gap-2">
          <Input
            placeholder="Nhập tin nhắn..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            size="icon"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateMessageDialog;
