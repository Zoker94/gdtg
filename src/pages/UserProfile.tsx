import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Shield,
  TrendingUp,
  Package,
  Calendar,
  User,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import PrivateMessageDialog from "@/components/messaging/PrivateMessageDialog";
import Footer from "@/components/Footer";

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!user,
  });

  const getReputationColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getReputationLabel = (score: number) => {
    if (score >= 90) return "Xuất sắc";
    if (score >= 70) return "Tốt";
    if (score >= 50) return "Trung bình";
    return "Cần cải thiện";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full border-border">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để xem hồ sơ</p>
            <Button onClick={() => navigate("/auth")}>Đăng nhập</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-40" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-[400px] w-full" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full border-border">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Không tìm thấy người dùng này</p>
            <Button onClick={() => navigate(-1)}>Quay lại</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = user.id === userId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">GDTG</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {/* Warning Banner from Admin */}
          {profile.warning_message && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Cảnh báo từ hệ thống</span>
              </div>
              <p className="text-sm">{profile.warning_message}</p>
            </div>
          )}

          {/* Banned Banner */}
          {profile.is_banned && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Tài khoản đã bị khoá</span>
              </div>
              <p className="text-sm">{profile.ban_reason || "Tài khoản này đã bị ban bởi quản trị viên."}</p>
            </div>
          )}

          {/* Profile Card */}
          <Card className="border-border mb-4">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                    {profile.full_name || "Người dùng"}
                    {isOwnProfile && (
                      <Badge variant="outline" className="text-xs">Bạn</Badge>
                    )}
                    {profile.is_banned && (
                      <Badge variant="destructive" className="text-xs">Bị ban</Badge>
                    )}
                    {profile.warning_message && !profile.is_banned && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">Cảnh báo</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {userId?.slice(0, 8)}...
                  </p>
                  
                  {/* Message Button */}
                  {!isOwnProfile && (
                    <Button 
                      onClick={() => setShowMessageDialog(true)}
                      className="mt-3 glow-primary"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Nhắn tin
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${getReputationColor(profile.reputation_score)}`} />
                  <p className="text-2xl font-bold">{profile.reputation_score}</p>
                  <p className="text-xs text-muted-foreground">Điểm uy tín</p>
                  <Badge 
                    variant="outline" 
                    className={`mt-1 text-xs ${getReputationColor(profile.reputation_score)}`}
                  >
                    {getReputationLabel(profile.reputation_score)}
                  </Badge>
                </div>

                <div className="p-4 bg-muted rounded-lg text-center">
                  <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{profile.total_transactions}</p>
                  <p className="text-xs text-muted-foreground">Giao dịch</p>
                </div>

                <div className="p-4 bg-muted rounded-lg text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {format(new Date(profile.created_at), "MM/yyyy", { locale: vi })}
                  </p>
                  <p className="text-xs text-muted-foreground">Tham gia</p>
                </div>
              </div>

              {/* Reputation Details */}
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Đánh giá độ tin cậy
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Điểm uy tín</span>
                    <span className={`font-semibold ${getReputationColor(profile.reputation_score)}`}>
                      {profile.reputation_score}/100
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        profile.reputation_score >= 70 ? "bg-green-500" : 
                        profile.reputation_score >= 50 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${profile.reputation_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {profile.reputation_score >= 70 
                      ? "✓ Người dùng đáng tin cậy với lịch sử giao dịch tốt"
                      : profile.reputation_score >= 50
                      ? "⚠ Hãy cẩn thận và kiểm tra kỹ trước khi giao dịch"
                      : "⚠ Cảnh báo: Người dùng có điểm uy tín thấp"}
                  </p>
                </div>
              </div>

              {/* Warning for low reputation */}
              {profile.reputation_score < 50 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Cảnh báo</span>
                  </div>
                  <p className="text-sm">
                    Người dùng này có điểm uy tín thấp. Hãy cân nhắc kỹ trước khi giao dịch 
                    và sử dụng tính năng escrow để bảo vệ tài sản của bạn.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Private Message Dialog */}
      <PrivateMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        otherUserId={userId || ""}
        otherUserName={profile.full_name || "Người dùng"}
        otherUserAvatar={profile.avatar_url}
      />
      <Footer />
    </div>
  );
};

export default UserProfile;
