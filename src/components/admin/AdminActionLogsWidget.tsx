import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminActionLogs } from "@/hooks/useAdminActionLogs";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  History,
  Ban,
  Snowflake,
  Wallet,
  AlertTriangle,
  UserCheck,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ACTION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  ban: { label: "Cấm tài khoản", icon: Ban, color: "bg-destructive text-destructive-foreground" },
  unban: { label: "Gỡ cấm", icon: UserCheck, color: "bg-emerald-500 text-white" },
  freeze: { label: "Đóng băng số dư", icon: Snowflake, color: "bg-sky-500 text-white" },
  unfreeze: { label: "Gỡ đóng băng", icon: Flame, color: "bg-orange-500 text-white" },
  adjust_balance: { label: "Điều chỉnh số dư", icon: Wallet, color: "bg-primary text-primary-foreground" },
  warning: { label: "Cảnh báo", icon: AlertTriangle, color: "bg-amber-500 text-white" },
};

const ITEMS_PER_PAGE = 10;

const AdminActionLogsWidget = () => {
  const { data: logs, isLoading } = useAdminActionLogs(200);
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = logs?.filter(
    (log) => filterType === "all" || log.action_type === filterType
  );

  const totalPages = Math.ceil((filteredLogs?.length || 0) / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (amount: number) => {
    const prefix = amount >= 0 ? "+" : "";
    return prefix + new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  const getActionDetails = (log: (typeof logs)[0]) => {
    if (!log) return null;

    const details = log.details as Record<string, unknown> | null;
    
    if (log.action_type === "adjust_balance" && details?.amount) {
      return (
        <span className={`font-medium ${(details.amount as number) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
          {formatCurrency(details.amount as number)}
        </span>
      );
    }

    if (log.action_type === "ban" && details?.reason) {
      return <span className="text-muted-foreground text-xs">Lý do: {details.reason as string}</span>;
    }

    if (log.action_type === "freeze" && details?.reason) {
      return <span className="text-muted-foreground text-xs">Lý do: {details.reason as string}</span>;
    }

    if (log.action_type === "warning" && details?.message) {
      return <span className="text-muted-foreground text-xs">"{details.message as string}"</span>;
    }

    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử hành động Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử hành động Admin
          </CardTitle>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="ban">Cấm tài khoản</SelectItem>
              <SelectItem value="unban">Gỡ cấm</SelectItem>
              <SelectItem value="freeze">Đóng băng số dư</SelectItem>
              <SelectItem value="unfreeze">Gỡ đóng băng</SelectItem>
              <SelectItem value="adjust_balance">Điều chỉnh số dư</SelectItem>
              <SelectItem value="warning">Cảnh báo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!paginatedLogs || paginatedLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Chưa có lịch sử hành động nào</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedLogs.map((log) => {
                const config = ACTION_TYPE_CONFIG[log.action_type] || {
                  label: log.action_type,
                  icon: History,
                  color: "bg-muted text-muted-foreground",
                };
                const Icon = config.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        <span className="font-medium">{log.admin_name}</span>
                        <span className="text-muted-foreground"> đã {config.label.toLowerCase()} </span>
                        <span className="font-medium">{log.target_user_name}</span>
                      </p>
                      {getActionDetails(log)}
                      {log.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ghi chú: {log.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Trang {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminActionLogsWidget;
