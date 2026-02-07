import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, Percent, Clock, DollarSign, MessageCircle, Timer } from "lucide-react";

const PlatformSettingsWidget = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = usePlatformSettings();
  
  const [feePercent, setFeePercent] = useState(5);
  const [disputeHours, setDisputeHours] = useState(24);
  const [minAmount, setMinAmount] = useState(10000);
  const [adminContactLink, setAdminContactLink] = useState("");
  const [withdrawalCooldown, setWithdrawalCooldown] = useState(15);

  useEffect(() => {
    if (settings) {
      setFeePercent(settings.default_fee_percent);
      setDisputeHours(settings.default_dispute_hours);
      setMinAmount(settings.min_transaction_amount);
      setAdminContactLink(settings.admin_contact_link);
      setWithdrawalCooldown(settings.withdrawal_cooldown_minutes);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (updates: { key: string; value: string }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ setting_value: update.value })
          .eq("setting_key", update.key);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Đã cập nhật cài đặt thành công!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateSettings.mutate([
      { key: "default_fee_percent", value: String(feePercent) },
      { key: "default_dispute_hours", value: String(disputeHours) },
      { key: "min_transaction_amount", value: String(minAmount) },
      { key: "admin_contact_link", value: adminContactLink },
      { key: "withdrawal_cooldown_minutes", value: String(withdrawalCooldown) },
    ]);
  };

  const hasChanges = settings && (
    feePercent !== settings.default_fee_percent ||
    disputeHours !== settings.default_dispute_hours ||
    minAmount !== settings.min_transaction_amount ||
    adminContactLink !== settings.admin_contact_link ||
    withdrawalCooldown !== settings.withdrawal_cooldown_minutes
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Cài đặt nền tảng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fee Percent */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Percent className="w-3.5 h-3.5 text-muted-foreground" />
            Phí sàn (%)
          </Label>
          <Input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={feePercent}
            onChange={(e) => setFeePercent(Number(e.target.value))}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Phí sẽ được tính trên mỗi giao dịch
          </p>
        </div>

        {/* Dispute Hours */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Thời gian khiếu nại (giờ)
          </Label>
          <Input
            type="number"
            min={1}
            max={720}
            value={disputeHours}
            onChange={(e) => setDisputeHours(Number(e.target.value))}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Thời hạn người mua có thể khiếu nại sau khi nhận hàng
          </p>
        </div>

        {/* Min Transaction Amount */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            Số tiền giao dịch tối thiểu (VNĐ)
          </Label>
          <Input
            type="number"
            min={0}
            step={1000}
            value={minAmount}
            onChange={(e) => setMinAmount(Number(e.target.value))}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Giá trị tối thiểu cho mỗi giao dịch
          </p>
        </div>

        {/* Admin Contact Link */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
            Link liên hệ Admin (Rút tiền)
          </Label>
          <Input
            type="url"
            placeholder="https://zalo.me/... hoặc https://m.me/..."
            value={adminContactLink}
            onChange={(e) => setAdminContactLink(e.target.value)}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Link Zalo/Messenger để user liên hệ khi rút tiền
          </p>
        </div>

        {/* Withdrawal Cooldown */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Timer className="w-3.5 h-3.5 text-muted-foreground" />
            Thời gian chờ rút tiền sau giao dịch (phút)
          </Label>
          <Input
            type="number"
            min={0}
            max={1440}
            value={withdrawalCooldown}
            onChange={(e) => setWithdrawalCooldown(Number(e.target.value))}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Số phút người dùng phải chờ sau khi giao dịch hoàn tất mới được rút tiền
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full gap-2"
          disabled={updateSettings.isPending || !hasChanges}
        >
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>

        {hasChanges && (
          <p className="text-xs text-center text-chart-4">
            Có thay đổi chưa được lưu
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformSettingsWidget;
