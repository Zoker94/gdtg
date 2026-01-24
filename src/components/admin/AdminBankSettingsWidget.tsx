import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Building, Save } from "lucide-react";

const AdminBankSettingsWidget = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = usePlatformSettings();
  
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  useEffect(() => {
    if (settings) {
      setBankName(settings.admin_bank_name || "");
      setBankAccount(settings.admin_bank_account || "");
      setBankHolder(settings.admin_bank_holder || "");
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
      toast({ title: "Đã cập nhật thông tin ngân hàng!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateSettings.mutate([
      { key: "admin_bank_name", value: bankName },
      { key: "admin_bank_account", value: bankAccount },
      { key: "admin_bank_holder", value: bankHolder },
    ]);
  };

  const hasChanges = settings && (
    bankName !== (settings.admin_bank_name || "") ||
    bankAccount !== (settings.admin_bank_account || "") ||
    bankHolder !== (settings.admin_bank_holder || "")
  );

  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="w-4 h-4" />
          Thông tin ngân hàng (hiển thị cho user nạp tiền)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Tên ngân hàng</Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="VD: Vietcombank"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Số tài khoản</Label>
            <Input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="VD: 1234567890"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Chủ tài khoản</Label>
            <Input
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              placeholder="VD: NGUYEN VAN A"
              className="h-9"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          className="gap-2"
          disabled={updateSettings.isPending || !hasChanges}
          size="sm"
        >
          <Save className="w-3.5 h-3.5" />
          {updateSettings.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>

        {hasChanges && (
          <p className="text-xs text-chart-4">Có thay đổi chưa được lưu</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminBankSettingsWidget;
