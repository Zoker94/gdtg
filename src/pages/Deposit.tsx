import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, CreditCard, Building, Smartphone, Copy, Check, QrCode, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "@/hooks/use-toast";

const paymentMethods = [
  {
    id: "bank",
    name: "Chuyển khoản ngân hàng",
    icon: Building,
    description: "Xác nhận trong 5-15 phút",
  },
  {
    id: "momo",
    name: "Ví MoMo",
    icon: Smartphone,
    description: "Xác nhận tức thì",
  },
  {
    id: "zalopay",
    name: "ZaloPay",
    icon: Smartphone,
    description: "Xác nhận tức thì",
  },
];

const momoInfo = {
  phone: "0912345678",
  name: "ESCROW VN",
};

const predefinedAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

const Deposit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: settings } = usePlatformSettings();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
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
        payment_method: method,
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

  const transferContent = depositId ? `NAP ${depositId.substring(0, 8).toUpperCase()}` : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">EscrowVN</span>
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
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {predefinedAmounts.map((a) => (
                    <Button
                      key={a}
                      variant={amount === a.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(a.toString())}
                    >
                      {a.toLocaleString()}đ
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Hoặc nhập số tiền khác..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={10000}
                />
                <p className="text-xs text-muted-foreground mt-1">Tối thiểu 10,000đ</p>
              </div>

              <div>
                <Label className="mb-3 block">Phương thức thanh toán</Label>
                <RadioGroup value={method} onValueChange={setMethod} className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={pm.id} id={pm.id} />
                      <Label htmlFor={pm.id} className="flex items-center gap-3 cursor-pointer flex-1">
                        <pm.icon className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{pm.name}</p>
                          <p className="text-xs text-muted-foreground">{pm.description}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
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
              {method === "bank" && (
                <>
                  <div className="p-4 bg-muted rounded-lg space-y-3">
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
                    ⚠️ Vui lòng nhập đúng nội dung chuyển khoản để được xác nhận nhanh nhất
                  </p>
                </>
              )}

              {(method === "momo" || method === "zalopay") && (
                <>
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Số điện thoại</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{momoInfo.phone}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(momoInfo.phone, "phone")}>
                          {copiedField === "phone" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tên</span>
                      <span className="font-medium">{momoInfo.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Số tiền</span>
                      <span className="font-medium text-primary">{parseFloat(amount).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Lời nhắn</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-primary">{transferContent}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(transferContent, "msg")}>
                          {copiedField === "msg" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    ⚠️ Vui lòng nhập đúng lời nhắn để được xác nhận tự động
                  </p>
                </>
              )}

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
    </div>
  );
};

export default Deposit;
