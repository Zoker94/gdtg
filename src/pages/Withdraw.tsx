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
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useWithdrawalRealtime } from "@/hooks/useWithdrawalRealtime";

const BANKS = [
  "Vietcombank",
  "Techcombank",
  "BIDV",
  "VietinBank",
  "ACB",
  "MB Bank",
  "VPBank",
  "Sacombank",
  "TPBank",
  "HDBank",
  "Agribank",
  "OCB",
  "SHB",
  "MSB",
  "VIB",
  "SeABank",
  "Nam A Bank",
  "Bac A Bank",
  "LienVietPostBank",
  "Eximbank",
  "Khác",
];

const Withdraw = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: platformSettings } = usePlatformSettings();

  // Enable realtime notifications for withdrawals
  useWithdrawalRealtime();

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

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

  // Create withdrawal mutation
  const createWithdrawal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_account_name: accountName.toUpperCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-withdrawals"] });
      toast({ title: "Đã tạo yêu cầu rút tiền!", description: "Vui lòng chờ admin xác nhận." });
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      setBankName("");
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    if (!bankName || !accountNumber || !accountName) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin ngân hàng", variant: "destructive" });
      return;
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

  // Check if KYC is not approved
  const isKYCApproved = profile?.kyc_status === "approved";

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
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="bank">Ngân hàng</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngân hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Số tài khoản</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="Nhập số tài khoản"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Tên chủ tài khoản</Label>
                  <Input
                    id="accountName"
                    type="text"
                    placeholder="VD: NGUYEN VAN A"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Viết in hoa, không dấu, đúng với tên trên tài khoản ngân hàng
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createWithdrawal.isPending || !amount || !bankName || !accountNumber || !accountName}
                >
                  {createWithdrawal.isPending ? "Đang xử lý..." : "Tạo yêu cầu rút tiền"}
                </Button>
              </form>

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
                          w.status === "rejected" ? "bg-destructive/10" : "bg-muted"
                        }`}>
                          {w.status === "completed" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : w.status === "rejected" ? (
                            <XCircle className="w-4 h-4 text-destructive" />
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
                            w.status === "rejected" ? "destructive" : "secondary"
                          }
                          className="mb-1"
                        >
                          {w.status === "completed" ? "Thành công" :
                           w.status === "rejected" ? "Từ chối" : "Đang chờ"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(w.created_at), "dd/MM/yyyy", { locale: vi })}
                        </p>
                        {w.status === "rejected" && w.admin_note && (
                          <p className="text-xs text-destructive mt-1">{w.admin_note}</p>
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
    </div>
  );
};

export default Withdraw;
