import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycSubmission } from "@/hooks/useKYC";
import { useLinkedBanks } from "@/hooks/useLinkedBanks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  ArrowLeft,
  Shield,
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageCircle,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useWithdrawalRealtime } from "@/hooks/useWithdrawalRealtime";
import LinkedBankAccountsCard from "@/components/LinkedBankAccountsCard";
import Footer from "@/components/Footer";
import { notifyAdminTelegram } from "@/lib/telegramNotify";

const Withdraw = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: kycSubmission } = useMyKycSubmission();
  const { data: linkedBanks, isLoading: linkedBanksLoading } = useLinkedBanks();
  const { data: platformSettings } = usePlatformSettings();

  // Enable realtime notifications for withdrawals
  useWithdrawalRealtime();

  const [amount, setAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");

  // Fetch user's withdrawals
  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["user-withdrawals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check last completed transaction time for cooldown
  const { data: lastCompletedTx } = useQuery({
    queryKey: ["last-completed-tx", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("completed_at")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  // Get selected bank details
  const selectedBank = linkedBanks?.find((b) => b.id === selectedBankId);

  // Create withdrawal mutation
  const createWithdrawal = useMutation({
    mutationFn: async () => {
      if (!selectedBank) throw new Error("Chưa chọn tài khoản ngân hàng");
      
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        bank_name: selectedBank.bank_name,
        bank_account_number: selectedBank.bank_account_number,
        bank_account_name: selectedBank.bank_account_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-withdrawals"] });
      toast({ title: "Đã tạo yêu cầu rút tiền!", description: "Vui lòng chờ admin xác nhận." });
      const amt = new Intl.NumberFormat("vi-VN").format(parseFloat(amount)) + "đ";
      notifyAdminTelegram(
        "withdrawal",
        "Yêu cầu rút tiền mới",
        `💳 Số tiền: ${amt}\n🏦 Ngân hàng: ${selectedBank?.bank_name}\n👤 Chủ TK: ${selectedBank?.bank_account_name}\n🔢 STK: ${selectedBank?.bank_account_number}`
      );
      setAmount("");
      setSelectedBankId("");
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
  };

  // Calculate cooldown remaining
  const getCooldownRemaining = () => {
    if (!lastCompletedTx?.completed_at || !platformSettings) return 0;
    const cooldownMs = platformSettings.withdrawal_cooldown_minutes * 60 * 1000;
    const completedAt = new Date(lastCompletedTx.completed_at).getTime();
    const remaining = (completedAt + cooldownMs) - Date.now();
    return Math.max(0, remaining);
  };

  const cooldownRemaining = getCooldownRemaining();
  const cooldownMinutes = Math.ceil(cooldownRemaining / 60000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check cooldown
    if (cooldownRemaining > 0) {
      toast({
        title: "Chưa thể rút tiền",
        description: `Vui lòng chờ thêm ${cooldownMinutes} phút sau giao dịch gần nhất.`,
        variant: "destructive",
      });
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({ title: "Lỗi", description: "Vui lòng nhập số tiền hợp lệ", variant: "destructive" });
      return;
    }
    
    if (amountNum < 50000) {
      toast({ title: "Lỗi", description: "Số tiền rút tối thiểu là 50,000đ", variant: "destructive" });
      return;
    }

    if (amountNum > (profile?.balance || 0)) {
      toast({ title: "Lỗi", description: "Số dư không đủ", variant: "destructive" });
      return;
    }

    if (!selectedBank) {
      toast({ title: "Lỗi", description: "Vui lòng chọn tài khoản ngân hàng", variant: "destructive" });
      return;
    }

    // Check if bank account name matches KYC name
    const normalizeName = (name: string) => {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .replace(/\s+/g, "")
        .toUpperCase();
    };

    if (kycSubmission?.full_name && selectedBank.bank_account_name) {
      const kycName = normalizeName(kycSubmission.full_name);
      const bankName = normalizeName(selectedBank.bank_account_name);
      
      if (kycName !== bankName) {
        toast({ 
          title: "Lỗi", 
          description: "Tên chủ tài khoản ngân hàng không khớp với tên trên KYC", 
          variant: "destructive" 
        });
        return;
      }
    }

    createWithdrawal.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để rút tiền</p>
            <Button onClick={() => navigate("/auth")}>Đăng nhập</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check requirements
  const isKYCApproved = profile?.kyc_status === "approved";
  const isPhoneVerified = profile?.is_verified === true;

  // Show phone verification required first
  if (!profileLoading && !isPhoneVerified) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-base">GDTG</span>
            </Link>
          </div>
        </header>
        <AnnouncementBanner />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-8 text-center">
              <Phone className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Yêu cầu xác minh số điện thoại</p>
              <p className="text-muted-foreground mb-4">
                Bạn cần xác thực số điện thoại qua Telegram để có thể rút tiền. Điều này giúp bảo vệ tài khoản của bạn.
              </p>
              <Button onClick={() => navigate("/my-profile")}>
                Xác minh ngay
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show KYC required
  if (!profileLoading && !isKYCApproved) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-base">GDTG</span>
            </Link>
          </div>
        </header>
        <AnnouncementBanner />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Yêu cầu xác minh danh tính</p>
              <p className="text-muted-foreground mb-4">
                Bạn cần hoàn thành xác minh KYC để có thể rút tiền. Điều này giúp bảo vệ tài khoản và giao dịch của bạn.
              </p>
              <Button onClick={() => navigate("/kyc")}>
                Xác minh ngay
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show suspicious account warning
  if (!profileLoading && profile?.is_suspicious) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-base">GDTG</span>
            </Link>
          </div>
        </header>
        <AnnouncementBanner />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-8 text-center">
              <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2 text-destructive">Tài khoản bị tạm khóa rút tiền</p>
              <p className="text-muted-foreground mb-2">
                Hệ thống phát hiện hoạt động bất thường trên tài khoản của bạn.
              </p>
              {profile?.suspicious_reason && (
                <p className="text-sm text-destructive mb-4 p-3 bg-destructive/10 rounded-lg">
                  Lý do: {profile.suspicious_reason}
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                Vui lòng liên hệ Admin để được hỗ trợ giải quyết.
              </p>
              {platformSettings?.admin_contact_link && (
                <Button asChild>
                  <a href={platformSettings.admin_contact_link} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Liên hệ Admin
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show balance frozen warning
  if (!profileLoading && profile?.is_balance_frozen === true) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-base">GDTG</span>
            </Link>
          </div>
        </header>
        <AnnouncementBanner />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>
          <Card className="border-sky-500/30 bg-sky-500/5">
            <CardContent className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-6 h-6 text-sky-500" />
              </div>
              <p className="text-lg font-semibold mb-2 text-sky-600">Số dư đang bị đóng băng</p>
              <p className="text-muted-foreground mb-2">
                Tài khoản của bạn vẫn hoạt động bình thường nhưng tạm thời không thể rút tiền.
              </p>
              {profile?.balance_freeze_reason && (
                <p className="text-sm text-sky-600 mb-4 p-3 bg-sky-100 dark:bg-sky-900/20 rounded-lg">
                  Lý do: {profile.balance_freeze_reason}
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                Vui lòng liên hệ Admin để được hỗ trợ giải quyết.
              </p>
              {platformSettings?.admin_contact_link && (
                <Button asChild className="bg-sky-500 hover:bg-sky-600">
                  <a href={platformSettings.admin_contact_link} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Liên hệ Admin
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-base">GDTG</span>
          </Link>
        </div>
      </header>

      <AnnouncementBanner />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>

          {/* Balance Card */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Số dư khả dụng</p>
                    {profileLoading ? (
                      <Skeleton className="h-7 w-32" />
                    ) : (
                      <p className="text-xl font-bold">{formatCurrency(profile?.balance || 0)}</p>
                    )}
                  </div>
                </div>
                <ArrowDownToLine className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Linked Bank Accounts */}
          <div className="mb-6">
            <LinkedBankAccountsCard kycFullName={kycSubmission?.full_name} />
          </div>

          {/* Withdrawal Form */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5" />
                Rút tiền về ngân hàng
              </CardTitle>
              <CardDescription>
                Tiền sẽ được chuyển sau khi admin xác nhận (trong 24h làm việc)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {linkedBanksLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : linkedBanks?.length === 0 ? (
                <div className="text-center py-4">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-muted-foreground">
                    Bạn cần thêm ít nhất một tài khoản ngân hàng để rút tiền
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {cooldownRemaining > 0 && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Đang trong thời gian chờ</p>
                        <p className="text-xs text-muted-foreground">
                          Bạn cần chờ thêm {cooldownMinutes} phút sau giao dịch gần nhất mới có thể rút tiền.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="bank">Chọn tài khoản nhận tiền</Label>
                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tài khoản ngân hàng" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkedBanks?.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bank_name} - {bank.bank_account_number} ({bank.bank_account_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Số tiền rút</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Tối thiểu 50,000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={50000}
                        max={profile?.balance || 0}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        VND
                      </span>
                    </div>
                    {amount && parseFloat(amount) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        = {formatCurrency(parseFloat(amount))}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createWithdrawal.isPending || !amount || !selectedBankId}
                  >
                    {createWithdrawal.isPending ? "Đang xử lý..." : "Tạo yêu cầu rút tiền"}
                  </Button>
                </form>
              )}

              {/* Contact Admin Button */}
              {platformSettings?.admin_contact_link && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    asChild
                  >
                    <a
                      href={platformSettings.admin_contact_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Liên hệ Admin hỗ trợ rút tiền
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Liên hệ nếu cần hỗ trợ xử lý yêu cầu rút tiền nhanh hơn
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Lịch sử rút tiền
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawalsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : withdrawals?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có yêu cầu rút tiền nào
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {withdrawals?.map((w) => (
                    <div key={w.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          w.status === "completed" ? "bg-green-500/10" :
                          w.status === "rejected" ? "bg-destructive/10" :
                          w.status === "on_hold" ? "bg-amber-500/10" : "bg-muted"
                        }`}>
                          {w.status === "completed" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : w.status === "rejected" ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : w.status === "on_hold" ? (
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{formatCurrency(w.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.bank_name} - {w.bank_account_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            w.status === "completed" ? "default" :
                            w.status === "rejected" ? "destructive" :
                            w.status === "on_hold" ? "outline" : "secondary"
                          }
                          className={`mb-1 ${w.status === "on_hold" ? "border-amber-500 text-amber-600" : ""}`}
                        >
                          {w.status === "completed" ? "Thành công" :
                           w.status === "rejected" ? "Từ chối" :
                           w.status === "on_hold" ? "Đang kiểm tra" : "Đang chờ"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(w.created_at), "dd/MM/yyyy", { locale: vi })}
                        </p>
                        {(w.status === "rejected" || w.status === "on_hold") && w.admin_note && (
                          <p className="text-xs text-amber-600 mt-1">{w.admin_note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Withdraw;
