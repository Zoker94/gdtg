import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import DashboardHeader from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ArrowLeft, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { useConversations } from "@/hooks/usePrivateMessages";
import PrivateMessageDialog from "@/components/messaging/PrivateMessageDialog";
import { cn } from "@/lib/utils";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<{
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string | null;
  } | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Vui lòng đăng nhập để xem tin nhắn
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Tin nhắn
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuộc hội thoại</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Chưa có cuộc hội thoại nào</p>
                <p className="text-sm mt-1">
                  Bắt đầu nhắn tin bằng cách truy cập hồ sơ người dùng hoặc bài đăng trong Khu mua bán
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => {
                  const otherUserId = conv.other_user?.user_id || "";
                  const otherUserName = conv.other_user?.full_name || "Người dùng";
                  const otherUserAvatar = conv.other_user?.avatar_url;
                  const unreadCount = conv.unread_count || 0;

                  return (
                    <button
                      key={conv.id}
                      onClick={() =>
                        setSelectedConversation({
                          otherUserId,
                          otherUserName,
                          otherUserAvatar,
                        })
                      }
                      className={cn(
                        "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left",
                        unreadCount > 0 && "bg-primary/5"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={otherUserAvatar || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(otherUserName)}
                          </AvatarFallback>
                        </Avatar>
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("font-medium text-sm truncate", unreadCount > 0 && "font-semibold")}>
                            {otherUserName}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </span>
                        </div>
                        {conv.last_message && (
                          <p className={cn("text-sm truncate", unreadCount > 0 ? "text-foreground" : "text-muted-foreground")}>
                            {conv.last_message}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/search-profile")}>
            <User className="w-4 h-4 mr-2" />
            Tìm người dùng để nhắn tin
          </Button>
        </div>
      </main>

      {selectedConversation && (
        <PrivateMessageDialog
          open={!!selectedConversation}
          onOpenChange={(open) => !open && setSelectedConversation(null)}
          otherUserId={selectedConversation.otherUserId}
          otherUserName={selectedConversation.otherUserName}
          otherUserAvatar={selectedConversation.otherUserAvatar}
        />
      )}
      <Footer />
    </div>
  );
};

export default Messages;
