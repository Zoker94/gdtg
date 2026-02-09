import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile, useUserRole } from "@/hooks/useProfile";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";
import { useProfileTheme } from "@/hooks/useProfileTheme";
import { useMyKycSubmission } from "@/hooks/useKYC";
import { getGradientById, getFrameById } from "@/data/profileThemes";
import { bgImages } from "@/components/profile/bgImages";
import { ProfileEffects } from "@/components/profile/ProfileEffects";
import ProfileThemeShop from "@/components/profile/ProfileThemeShop";
import FramedAvatar from "@/components/profile/FramedAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import TelegramVerification from "@/components/TelegramVerification";
import {
  Shield,
  TrendingUp,
  Package,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  User,
  Edit3,
  Check,
  X,
  LogOut,
  IdCard,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Footer from "@/components/Footer";
import SocialLinksCard from "@/components/profile/SocialLinksCard";

const MyProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: roleInfo } = useUserRole();
  const { data: kycSubmission } = useMyKycSubmission();
  const { data: profileTheme } = useProfileTheme(user?.id);
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Enable realtime updates
  useProfileRealtime();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file ảnh",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "File ảnh phải nhỏ hơn 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;

      // Upload to storage - path is just the filename since bucket is 'avatars'
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      await updateProfile.mutateAsync({ avatar_url: urlData.publicUrl });

      toast({
        title: "Thành công",
        description: "Đã cập nhật ảnh đại diện",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải ảnh lên. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleStartEditName = () => {
    setNewName(profile?.full_name || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên không được để trống",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProfile.mutateAsync({ full_name: newName.trim() });
      toast({ title: "Đã cập nhật tên" });
      setIsEditingName(false);
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật tên",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full border-border">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
          <Skeleton className="h-[500px] w-full" />
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
            <p className="text-muted-foreground mb-4">Không tìm thấy hồ sơ</p>
            <Button onClick={() => navigate("/dashboard")}>Về Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeGradient = getGradientById(profileTheme?.gradient_id || "default");

  return (
    <div className={`min-h-screen relative ${activeGradient.bgImage ? '' : activeGradient.css}`}>
      {activeGradient.bgImage && (
        <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${bgImages[activeGradient.bgImage]})`, backgroundRepeat: 'repeat', backgroundSize: 'auto' }} />
      )}
      <ProfileEffects effectId={profileTheme?.effect_id || "default"} />
      <div className={`min-h-screen relative ${activeGradient.bgImage ? 'bg-background/40' : 'bg-background/80 backdrop-blur-sm'}`}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-base">GDTG</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Avatar & Name Section */}
           <Card className="border-border overflow-hidden bg-card/80">
            <div className="h-24 bg-gradient-to-r from-primary/10 to-transparent" />
            <CardContent className="relative pt-0 pb-6">
              {/* Avatar */}
              <div className="relative -mt-12 mb-4 flex justify-center">
              <div className="relative">
                  {(() => {
                    const frame = getFrameById(profileTheme?.frame_id || "default");
                    return (
                      <FramedAvatar
                        frame={frame}
                        avatarUrl={profile.avatar_url}
                        fallbackText={profile.full_name?.charAt(0)?.toUpperCase() || "U"}
                      />
                    );
                  })()}
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="text-center">
                {isEditingName ? (
                  <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nhập tên của bạn"
                      className="text-center"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={updateProfile.isPending}>
                      <Check className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <h1 className="text-xl font-bold">{profile.full_name || "Người dùng"}</h1>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleStartEditName}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Balance Card */}
          <Card className="border-border bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Số dư tài khoản
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary mb-4">
                {formatCurrency(profile.balance)}
              </p>
              <div className="flex gap-2 mb-2">
                <Button onClick={() => navigate("/deposit")} className="flex-1 gap-2">
                  <ArrowDownLeft className="w-4 h-4" />
                  Nạp tiền
                </Button>
                <Button onClick={() => navigate("/withdraw")} variant="outline" className="flex-1 gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  Rút tiền
                </Button>
              </div>
              <Button 
                onClick={() => navigate("/wallet-history")} 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Xem lịch sử nạp/rút tiền →
              </Button>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border">
              <CardContent className="py-4 text-center">
                <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${getReputationColor(profile.reputation_score)}`} />
                <p className="text-2xl font-bold">{profile.reputation_score}</p>
                <p className="text-xs text-muted-foreground">Điểm uy tín</p>
                <Badge
                  variant="outline"
                  className={`mt-1 text-xs ${getReputationColor(profile.reputation_score)}`}
                >
                  {getReputationLabel(profile.reputation_score)}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="py-4 text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{profile.total_transactions}</p>
                <p className="text-xs text-muted-foreground">Giao dịch</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="py-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {format(new Date(profile.created_at), "MM/yyyy", { locale: vi })}
                </p>
                <p className="text-xs text-muted-foreground">Tham gia</p>
              </CardContent>
            </Card>
          </div>

          {/* KYC Status Card */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <IdCard className="w-4 h-4 text-primary" />
                Xác minh danh tính (KYC)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!kycSubmission || kycSubmission.status === "none" ? (
                <div className="text-center py-4">
                  <IdCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Xác minh danh tính để tăng độ tin cậy với đối tác giao dịch
                  </p>
                  <Button onClick={() => navigate("/kyc")} className="gap-2">
                    <IdCard className="w-4 h-4" />
                    Xác minh ngay
                  </Button>
                </div>
              ) : kycSubmission.status === "pending" ? (
                <div className="flex items-center gap-3 py-2">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <Badge variant="secondary">Đang chờ duyệt</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hồ sơ KYC của bạn đang được xem xét
                    </p>
                  </div>
                </div>
              ) : kycSubmission.status === "approved" ? (
                <div className="flex items-center gap-3 py-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <Badge variant="default" className="bg-green-500">Đã xác minh</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tài khoản của bạn đã được xác minh danh tính
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-8 h-8 text-destructive" />
                    <div>
                      <Badge variant="destructive">Bị từ chối</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {kycSubmission.rejection_reason || "Hồ sơ không hợp lệ"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/kyc")} className="w-full gap-2">
                    <IdCard className="w-4 h-4" />
                    Gửi lại hồ sơ KYC
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Links Card */}
          <SocialLinksCard
            facebookUrl={profile.facebook_url}
            zaloContact={profile.zalo_contact}
            phone={profile.phone}
            bio={profile.bio}
            isOwnProfile={true}
          />

          {/* Telegram Verification */}
          <TelegramVerification
            isVerified={profile.is_verified || false}
            phoneNumber={profile.phone_number}
          />
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Đánh giá độ tin cậy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Điểm uy tín</span>
                <span className={`font-semibold ${getReputationColor(profile.reputation_score)}`}>
                  {profile.reputation_score}/100
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    profile.reputation_score >= 70
                      ? "bg-green-500"
                      : profile.reputation_score >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${profile.reputation_score}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.reputation_score >= 70
                  ? "✓ Bạn là người dùng đáng tin cậy với lịch sử giao dịch tốt"
                  : profile.reputation_score >= 50
                  ? "⚠ Tiếp tục giao dịch thành công để tăng điểm uy tín"
                  : "⚠ Hãy hoàn thành các giao dịch để cải thiện điểm uy tín"}
              </p>
              <p className="text-xs text-muted-foreground">
                💡 Mẹo: Xác minh KYC và hoàn thành giao dịch giúp tăng độ uy tín với đối tác.
              </p>
            </CardContent>
          </Card>

          {/* Profile Theme Shop - Super Admin only */}
          {roleInfo?.isSuperAdmin && <ProfileThemeShop />}

          {/* Sign Out */}
          <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </Button>
        </motion.div>
      </main>
      <Footer />
      </div>
    </div>
  );
};

export default MyProfile;
