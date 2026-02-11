import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Bot, Save, Send, Info } from "lucide-react";

const TelegramNotifyWidget = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = usePlatformSettings();

  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setChatId(settings.admin_telegram_chat_id || "");
      setEnabled(settings.telegram_notifications_enabled || false);
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
      toast({ title: "Đã cập nhật cài đặt Telegram!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const testNotify = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("telegram-notify-admin", {
        body: {
          type: "custom",
          title: "Test thông báo",
          message: "🎉 Hệ thống thông báo Telegram đang hoạt động!\n\nBạn sẽ nhận được thông báo khi có:\n• KYC mới\n• Yêu cầu rút tiền\n• Nạp tiền mới\n• Khiếu nại\n• Cảnh báo rủi ro",
        },
      });
      if (error) throw error;
      if (data?.skipped) throw new Error(data.reason || "Thông báo bị bỏ qua");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Đã gửi thông báo test!", description: "Kiểm tra Telegram của bạn." });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi gửi test", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateSettings.mutate([
      { key: "admin_telegram_chat_id", value: chatId },
      { key: "telegram_notifications_enabled", value: String(enabled) },
    ]);
  };

  const hasChanges = settings && (
    chatId !== (settings.admin_telegram_chat_id || "") ||
    enabled !== (settings.telegram_notifications_enabled || false)
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Bot className="w-4 h-4" />
          Thông báo Telegram Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Bot sẽ gửi thông báo đến Chat ID khi có KYC mới, yêu cầu rút tiền, nạp tiền, khiếu nại hoặc cảnh báo rủi ro.
            <br />
            <strong>Cách lấy Chat ID:</strong> Nhắn tin cho bot 
            <code className="mx-1 px-1 bg-muted rounded">@userinfobot</code> 
            trên Telegram để lấy ID của bạn, hoặc thêm bot vào nhóm và lấy ID nhóm.
          </AlertDescription>
        </Alert>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <div>
              <Label className="text-sm font-medium">Bật thông báo Telegram</Label>
              <p className="text-xs text-muted-foreground">
                Nhận thông báo qua Telegram khi có sự kiện quan trọng
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* Chat ID Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            Chat ID Admin
          </Label>
          <Input
            type="text"
            placeholder="Nhập Chat ID (ví dụ: 123456789 hoặc -100123456789)"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="h-9 font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Có thể là ID cá nhân hoặc ID nhóm Telegram
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            className="flex-1 gap-2"
            disabled={updateSettings.isPending || !hasChanges}
          >
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
          <Button
            variant="outline"
            onClick={() => testNotify.mutate()}
            disabled={testNotify.isPending || !chatId || !enabled}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {testNotify.isPending ? "Đang gửi..." : "Test"}
          </Button>
        </div>

        {hasChanges && (
          <p className="text-xs text-center text-chart-4">
            Có thay đổi chưa được lưu
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramNotifyWidget;
