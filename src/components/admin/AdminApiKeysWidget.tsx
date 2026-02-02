import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Key, Save, Eye, EyeOff, Bot, CreditCard, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminSecret {
  id: string;
  secret_key: string;
  secret_value: string;
  description: string | null;
  updated_at: string;
}

const AdminApiKeysWidget = () => {
  const queryClient = useQueryClient();
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [originalSecrets, setOriginalSecrets] = useState<Record<string, string>>({});

  const { data: adminSecrets, isLoading, error } = useQuery({
    queryKey: ["admin-secrets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_secrets")
        .select("*")
        .order("secret_key");
      
      if (error) throw error;
      return data as AdminSecret[];
    },
  });

  useEffect(() => {
    if (adminSecrets) {
      const secretMap: Record<string, string> = {};
      adminSecrets.forEach((s) => {
        secretMap[s.secret_key] = s.secret_value;
      });
      setSecrets(secretMap);
      setOriginalSecrets(secretMap);
    }
  }, [adminSecrets]);

  const updateSecrets = useMutation({
    mutationFn: async (updates: { key: string; value: string }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("admin_secrets")
          .update({ 
            secret_value: update.value,
            updated_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq("secret_key", update.key);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-secrets"] });
      toast({ title: "Đã cập nhật API Keys thành công!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const updates = Object.entries(secrets)
      .filter(([key, value]) => value !== originalSecrets[key])
      .map(([key, value]) => ({ key, value }));
    
    if (updates.length > 0) {
      updateSecrets.mutate(updates);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasChanges = Object.entries(secrets).some(
    ([key, value]) => value !== originalSecrets[key]
  );

  const getIcon = (key: string) => {
    if (key.includes("TELEGRAM")) return <Bot className="w-4 h-4 text-primary" />;
    if (key.includes("SEPAY")) return <CreditCard className="w-4 h-4 text-primary" />;
    return <Key className="w-4 h-4 text-muted-foreground" />;
  };

  const getLabel = (key: string) => {
    switch (key) {
      case "TELEGRAM_BOT_TOKEN": return "Telegram Bot Token";
      case "SEPAY_MERCHANT_ID": return "SePay Merchant ID";
      case "SEPAY_SECRET_KEY": return "SePay Secret Key";
      default: return key;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Không thể tải API Keys. Bạn cần có quyền Admin để xem mục này.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="w-4 h-4" />
          Quản lý API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Các API Keys này sẽ được sử dụng bởi hệ thống để kết nối với Telegram và SePay. 
            Chỉ Admin mới có thể xem và chỉnh sửa.
          </AlertDescription>
        </Alert>

        {adminSecrets?.map((secret) => (
          <div key={secret.id} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              {getIcon(secret.secret_key)}
              {getLabel(secret.secret_key)}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showValues[secret.secret_key] ? "text" : "password"}
                  value={secrets[secret.secret_key] || ""}
                  onChange={(e) => setSecrets(prev => ({ 
                    ...prev, 
                    [secret.secret_key]: e.target.value 
                  }))}
                  placeholder={`Nhập ${getLabel(secret.secret_key)}...`}
                  className="h-9 pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 px-2"
                  onClick={() => toggleShowValue(secret.secret_key)}
                >
                  {showValues[secret.secret_key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            {secret.description && (
              <p className="text-xs text-muted-foreground">{secret.description}</p>
            )}
          </div>
        ))}

        <Button 
          onClick={handleSave} 
          className="w-full gap-2"
          disabled={updateSecrets.isPending || !hasChanges}
        >
          <Save className="w-4 h-4" />
          {updateSecrets.isPending ? "Đang lưu..." : "Lưu API Keys"}
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

export default AdminApiKeysWidget;
