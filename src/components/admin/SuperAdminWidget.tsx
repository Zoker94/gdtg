import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Crown, Eraser, Wrench, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SuperAdminWidget = () => {
  const queryClient = useQueryClient();
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);

  // Fetch maintenance mode setting
  const { data: maintenanceMode, isLoading } = useQuery({
    queryKey: ["maintenance-mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "maintenance_mode")
        .maybeSingle();
      
      if (error) throw error;
      return data?.setting_value === "true";
    },
  });

  // Toggle maintenance mode
  const toggleMaintenance = useMutation({
    mutationFn: async (enabled: boolean) => {
      // First check if setting exists
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", "maintenance_mode")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ setting_value: enabled ? "true" : "false" })
          .eq("setting_key", "maintenance_mode");
        if (error) throw error;
      } else {
        // Need to insert - but we can't insert due to RLS, so we'll handle this in migration
        throw new Error("Maintenance mode setting not found");
      }
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-mode"] });
      toast({
        title: enabled ? "Đã bật chế độ bảo trì" : "Đã tắt chế độ bảo trì",
        description: enabled 
          ? "Tất cả người dùng (trừ bạn) sẽ thấy trang bảo trì" 
          : "Website đã hoạt động bình thường",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMaintenanceToggle = () => {
    if (!maintenanceMode) {
      // Turning on - show confirmation
      setConfirmMaintenance(true);
    } else {
      // Turning off - no confirmation needed
      toggleMaintenance.mutate(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="w-5 h-5 text-purple-500" />
            Quyền Super Admin
            <Badge variant="outline" className="ml-auto text-purple-500 border-purple-500/50">
              Bí mật
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Log Eraser */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
                <Eraser className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-sm font-medium">Xóa dấu vết</Label>
                <p className="text-xs text-muted-foreground">
                  Hành động của bạn không bị ghi log
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">
              Đang bật
            </Badge>
          </div>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${maintenanceMode ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"}`}>
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-sm font-medium">Chế độ bảo trì</Label>
                <p className="text-xs text-muted-foreground">
                  {maintenanceMode 
                    ? "Website đang bảo trì cho người khác" 
                    : "Tắt website cho tất cả (trừ bạn)"}
                </p>
              </div>
            </div>
            <Switch
              checked={maintenanceMode || false}
              onCheckedChange={handleMaintenanceToggle}
              disabled={toggleMaintenance.isPending}
            />
          </div>

          {maintenanceMode && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Website đang ở chế độ bảo trì. Chỉ bạn có thể truy cập.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmMaintenance} onOpenChange={setConfirmMaintenance}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              Bật chế độ bảo trì?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Khi bật chế độ này, tất cả người dùng (kể cả Admin) sẽ không thể truy cập website 
              và sẽ thấy trang thông báo bảo trì. Chỉ có bạn (Super Admin) vẫn có thể truy cập 
              và thao tác bình thường.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleMaintenance.mutate(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Bật bảo trì
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SuperAdminWidget;
