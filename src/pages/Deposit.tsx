import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, CreditCard, Building, Copy, Check, QrCode, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import confetti from "canvas-confetti";

const predefinedAmounts = [10000, 50000, 100000, 200000, 500000, 1000000, 2000000];

// Map bank names to VietQR BIN codes (case-insensitive matching)
const bankBinMap: Record<string, string> = {
  "vietcombank": "970436",
  "vcb": "970436",
  "bidv": "970418",
  "vietinbank": "970415",
  "icb": "970415",
  "techcombank": "970407",
  "tcb": "970407",
  "mbbank": "970422",
  "mb bank": "970422",
  "mb": "970422",
  "acb": "970416",
  "sacombank": "970403",
  "stb": "970403",
  "vpbank": "970432",
  "tpbank": "970423",
  "agribank": "970405",
  "agb": "970405",
};

const Deposit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: settings } = usePlatformSettings();
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<"input" | "payment" | "success">("input");
  const [loading, setLoading] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number>(0);

  // Use admin bank settings from platform_settings
  const bankInfo = {
    bank: settings?.admin_bank_name || "Vietcombank",
    account: settings?.admin_bank_account || "1234567890",
    name: settings?.admin_bank_holder || "ESCROW VN",
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Đã copy!" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fire confetti animation
  const fireConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  // Subscribe to deposit status changes for auto-redirect
  useEffect(() => {
    if (!depositId) return;

    setIsWaitingForPayment(true);
    console.log("Subscribing to deposit updates:", depositId);

    const channel = supabase
      .channel(`deposit-${depositId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposits',
          filter: `id=eq.${depositId}`,
        },
        (payload) => {
          console.log("Deposit update received:", payload);
          const newStatus = payload.new?.status;
          if (newStatus === 'completed') {
            const depositAmount = Number(payload.new?.amount) || 0;
            setSuccessAmount(depositAmount);
            setIsWaitingForPayment(false);
            setStep("success");
            
            // Fire confetti
            fireConfetti();
            
            toast({ 
              title: "🎉 Nạp tiền thành công!", 
              description: `Số tiền ${depositAmount.toLocaleString()}đ đã được cộng vào tài khoản` 
            });
            
            // Auto redirect after 3 seconds
            setTimeout(() => {
              navigate('/dashboard');
            }, 3000);
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Unsubscribing from deposit updates");
      supabase.removeChannel(channel);
    };
  }, [depositId, navigate, fireConfetti]);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10000) {
      toast({ title: "Lỗi", description: "Số tiền tối thiểu là 10,000đ", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Lỗi", description: "Vui lòng đăng nhập", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("deposits")
      .insert({
        user_id: user.id,
        amount: numAmount,
        payment_method: "bank",
        transaction_ref: `DEP-${Date.now()}`,
        is_submitted: false,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Lỗi", description: "Không thể tạo yêu cầu nạp tiền", variant: "destructive" });
      setLoading(false);
      return;
    }

    setDepositId(data.id);
    setStep("payment");
    setLoading(false);
  };

  // Shorten the deposit ID for transfer content (first 8 chars)
  const shortDepositId = depositId ? depositId.substring(0, 8).toUpperCase() : "";
  const transferContent = depositId ? `NAP${shortDepositId}` : "";
  
  // Generate VietQR URL using admin bank settings
  const getBankBin = (bankName: string): string => {
    const normalizedName = bankName.toLowerCase().trim();
    return bankBinMap[normalizedName] || "970436"; // Default to Vietcombank
  };

  const bankBin = getBankBin(bankInfo.bank);
  const vietQRUrl = depositId && amount 
    ? `https://img.vietqr.io/image/${bankBin}-${bankInfo.account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankInfo.name)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">GDTG</span>
          </Link>
          {profile && (
            <div className="text-sm">
              Số dư: <span className="font-bold text-primary">{profile.balance.toLocaleString()}đ</span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => step === "payment" ? setStep("input") : navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === "payment" ? "Chọn lại" : "Quay lại"}
        </Button>

        {step === "input" ? (
          <Card className="max-w-lg mx-auto border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Nạp tiền vào tài khoản
              </CardTitle>
              <CardDescription>Chọn số tiền và phương thức thanh toán</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-2 block">Số tiền nạp</Label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {predefinedAmounts.map((a) => (
                    <Button
                      key={a}
                      variant={amount === a.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setAmount(a.toString());
                        setCustomAmount("");
                      }}
                    >
                      {a.toLocaleString()}đ
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Hoặc nhập số tiền khác:</Label>
                  <Input
                    type="number"
                    placeholder="Nhập số tiền..."
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setAmount(e.target.value);
                    }}
                    min={10000}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Tối thiểu 10,000đ</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-primary" />
                  <span className="font-medium">Chuyển khoản ngân hàng</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Xác nhận tự động qua SePay</p>
              </div>

              <Button onClick={handleSubmit} className="w-full glow-primary" disabled={loading}>
                {loading ? "Đang xử lý..." : "Tiếp tục"}
              </Button>
            </CardContent>
          </Card>
        ) : step === "payment" ? (
          <Card className="max-w-lg mx-auto border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Hoàn tất thanh toán
              </CardTitle>
              <CardDescription>
                Chuyển <span className="font-bold text-primary">{parseFloat(amount).toLocaleString()}đ</span> theo thông tin bên dưới
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* VietQR Code */}
              {vietQRUrl && (
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quét mã QR để chuyển khoản</p>
                  <img 
                    src={vietQRUrl} 
                    alt="VietQR Code" 
                    className="w-64 h-auto rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-2">Quét bằng app ngân hàng hoặc ví điện tử</p>
                </div>
              )}

              {/* Bank Transfer Info */}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium text-center mb-2">Hoặc chuyển khoản thủ công:</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ngân hàng</span>
                  <span className="font-medium">{bankInfo.bank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{bankInfo.account}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(bankInfo.account, "account")}>
                      {copiedField === "account" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Chủ tài khoản</span>
                  <span className="font-medium">{bankInfo.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Số tiền</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary">{parseFloat(amount).toLocaleString()}đ</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(amount, "amount")}>
                      {copiedField === "amount" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nội dung CK</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-primary">{transferContent}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(transferContent, "content")}>
                      {copiedField === "content" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border space-y-3">
                {isWaitingForPayment && (
                  <div className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm font-medium text-center">Đang chờ xác nhận thanh toán...</p>
                    <p className="text-xs text-muted-foreground text-center">
                      Hệ thống sẽ tự động cộng tiền và chuyển về Dashboard sau khi nhận được thanh toán
                    </p>
                  </div>
                )}
                
                <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                  Về Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Success step with confetti
          <Card className="max-w-lg mx-auto border-border animate-scale-in">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-fade-in">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Nạp tiền thành công!</h2>
                <p className="text-3xl font-bold text-primary">
                  +{successAmount.toLocaleString()}đ
                </p>
                <p className="text-sm text-muted-foreground">
                  Số tiền đã được cộng vào tài khoản của bạn
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang chuyển về Dashboard...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Deposit;
