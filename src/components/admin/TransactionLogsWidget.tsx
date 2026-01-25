import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAllTransactionLogs, TransactionLog } from "@/hooks/useTransactionLogs";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, Search, Eye, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  created: { label: "Tạo mới", variant: "default" },
  status_changed: { label: "Đổi trạng thái", variant: "secondary" },
  buyer_joined: { label: "Buyer vào", variant: "outline" },
  seller_joined: { label: "Seller vào", variant: "outline" },
  buyer_confirmed: { label: "Buyer xác nhận", variant: "default" },
  seller_confirmed: { label: "Seller xác nhận", variant: "default" },
  dispute_filed: { label: "Khiếu nại", variant: "destructive" },
  deleted: { label: "Đã xóa", variant: "destructive" },
};

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  deposited: "Đã cọc",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  disputed: "Khiếu nại",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn",
};

export const TransactionLogsWidget = () => {
  const { data: logs, isLoading, error } = useAllTransactionLogs();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<TransactionLog | null>(null);
  const queryClient = useQueryClient();

  const filteredLogs = logs?.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.transaction_id.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.note?.toLowerCase().includes(searchLower) ||
      log.performed_by?.toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["all-transaction-logs"] });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Giao Dịch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Lỗi tải log: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Log Giao Dịch
          {logs && (
            <Badge variant="secondary" className="ml-2">
              {logs.length} bản ghi
            </Badge>
          )}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã giao dịch, hành động, ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Mã GD</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead className="text-right">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Không có log nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log) => {
                  const actionInfo = actionLabels[log.action] || { label: log.action, variant: "outline" as const };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.transaction_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {log.note || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.performed_by ? `${log.performed_by.slice(0, 8)}...` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Chi tiết Log</DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Thời gian</p>
                                    <p className="font-medium">
                                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Mã giao dịch</p>
                                    <p className="font-mono text-xs">{selectedLog.transaction_id}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Hành động</p>
                                    <Badge variant={actionLabels[selectedLog.action]?.variant || "outline"}>
                                      {actionLabels[selectedLog.action]?.label || selectedLog.action}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Người thực hiện</p>
                                    <p className="font-mono text-xs">{selectedLog.performed_by || "Hệ thống"}</p>
                                  </div>
                                  {selectedLog.old_status && (
                                    <div>
                                      <p className="text-muted-foreground">Trạng thái cũ</p>
                                      <Badge variant="outline">
                                        {statusLabels[selectedLog.old_status] || selectedLog.old_status}
                                      </Badge>
                                    </div>
                                  )}
                                  {selectedLog.new_status && (
                                    <div>
                                      <p className="text-muted-foreground">Trạng thái mới</p>
                                      <Badge variant="secondary">
                                        {statusLabels[selectedLog.new_status] || selectedLog.new_status}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                {selectedLog.note && (
                                  <div>
                                    <p className="text-muted-foreground text-sm">Ghi chú</p>
                                    <p className="p-2 bg-muted rounded text-sm">{selectedLog.note}</p>
                                  </div>
                                )}
                                {selectedLog.new_data && (
                                  <div>
                                    <p className="text-muted-foreground text-sm mb-2">Dữ liệu mới</p>
                                    <pre className="p-3 bg-muted rounded text-xs overflow-auto max-h-[200px]">
                                      {JSON.stringify(selectedLog.new_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {selectedLog.old_data && (
                                  <div>
                                    <p className="text-muted-foreground text-sm mb-2">Dữ liệu cũ</p>
                                    <pre className="p-3 bg-muted rounded text-xs overflow-auto max-h-[200px]">
                                      {JSON.stringify(selectedLog.old_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
