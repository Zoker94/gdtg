import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Zap,
  CreditCard,
  Users,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useRiskAlerts, useResolveRiskAlert, useDeleteRiskAlert, RiskAlert } from "@/hooks/useRiskAlerts";

const alertTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  quick_withdraw: { 
    label: "Rút nhanh", 
    icon: Zap, 
    color: "text-red-500" 
  },
  high_volume: { 
    label: "Giao dịch lớn", 
    icon: DollarSign, 
    color: "text-orange-500" 
  },
  rapid_transactions: { 
    label: "GD liên tục", 
    icon: Clock, 
    color: "text-amber-500" 
  },
  multiple_banks: { 
    label: "Nhiều TK NH", 
    icon: CreditCard, 
    color: "text-blue-500" 
  },
  multiple_sources: { 
    label: "Nhiều nguồn tiền", 
    icon: Users, 
    color: "text-purple-500" 
  },
};

const RiskAlertsWidget = () => {
  const { data: alerts, isLoading } = useRiskAlerts();
  const resolveAlert = useResolveRiskAlert();
  const deleteAlert = useDeleteRiskAlert();

  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const unresolvedAlerts = alerts?.filter((a) => !a.is_resolved) || [];
  const resolvedAlerts = alerts?.filter((a) => a.is_resolved) || [];

  const handleResolve = () => {
    if (!selectedAlert) return;
    resolveAlert.mutate({ alertId: selectedAlert.id, note: resolutionNote });
    setShowResolveDialog(false);
    setSelectedAlert(null);
    setResolutionNote("");
  };

  const getAlertConfig = (type: string) => {
    return alertTypeConfig[type] || { label: type, icon: AlertTriangle, color: "text-muted-foreground" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Cảnh báo rủi ro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={unresolvedAlerts.length > 0 ? "border-red-500/30 bg-red-500/5" : ""}>
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${unresolvedAlerts.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            Cảnh báo rủi ro
            {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {unresolvedAlerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {unresolvedAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              Không có cảnh báo mới
            </p>
          ) : (
            <ScrollArea className={unresolvedAlerts.length > 3 ? "h-[250px]" : ""}>
              <div className="space-y-2">
                {unresolvedAlerts.map((alert) => {
                  const config = getAlertConfig(alert.alert_type);
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg bg-background border shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(alert.created_at), "dd/MM HH:mm", { locale: vi })}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{alert.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                            User: {alert.user_id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setShowResolveDialog(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Xử lý
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={() => deleteAlert.mutate(alert.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Show resolved count if any */}
          {resolvedAlerts.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t">
              {resolvedAlerts.length} cảnh báo đã được xử lý
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý cảnh báo rủi ro</DialogTitle>
            <DialogDescription>
              {selectedAlert && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">{selectedAlert.description}</p>
                  <p className="text-xs">User ID: {selectedAlert.user_id}</p>
                  <p className="text-xs">
                    Thời gian: {format(new Date(selectedAlert.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </p>
                  {selectedAlert.metadata && typeof selectedAlert.metadata === 'object' && (
                    <pre className="text-xs mt-2 p-2 bg-background rounded overflow-auto">
                      {JSON.stringify(selectedAlert.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ghi chú xử lý (tùy chọn)</label>
              <Input
                placeholder="VD: Đã kiểm tra, giao dịch hợp lệ"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleResolve} disabled={resolveAlert.isPending}>
              {resolveAlert.isPending ? "Đang xử lý..." : "Đánh dấu đã xử lý"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RiskAlertsWidget;
