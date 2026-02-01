import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, CreditCard, Building, Copy, Check, QrCode, CheckCircle } from "lucide-react";
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
  const [step, setStep] = useState<"input" | "payment">("input");
  const [loading, setLoading] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasConfirmedPayment, setHasConfirmedPayment] = useState(false);

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

  const handleConfirmPayment = async () => {
    if (!depositId) return;

    setLoading(true);

    const { error } = await supabase
      .from("deposits")
      .update({ is_submitted: true })
      .eq("id", depositId);

    if (error) {
      toast({ title: "Lỗi", description: "Không thể xác nhận", variant: "destructive" });
      setLoading(false);
      return;
    }

    setHasConfirmedPayment(true);
    toast({ title: "Đã gửi xác nhận!", description: "Admin sẽ kiểm tra và duyệt trong ít phút" });
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
        ) : (
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
              
              <p className="text-xs text-center text-muted-foreground">
                ⚠️ Nội dung chuyển khoản đã được điền sẵn trong mã QR. Hệ thống sẽ tự động xác nhận sau khi nhận được tiền.
              </p>

              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  Sau khi chuyển khoản thành công, bấm nút bên dưới để Admin xác nhận
                </p>
                
                {!hasConfirmedPayment ? (
                  <Button 
                    className="w-full glow-primary" 
                    onClick={handleConfirmPayment}
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {loading ? "Đang xử lý..." : "Đã nạp tiền"}
                  </Button>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 text-green-600 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      Đã gửi xác nhận
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Admin sẽ kiểm tra và cộng tiền trong 5-15 phút
                    </p>
                  </div>
                )}
                
                <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                  Về Dashboard
                </Button>
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
