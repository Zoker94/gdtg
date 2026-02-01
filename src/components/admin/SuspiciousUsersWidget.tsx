import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle,
  Ban,
  AlertCircle,
  DollarSign,
  MessageCircle,
} from "lucide-react";

interface SuspiciousUser {
  id: string;
  user_id: string;
  full_name: string | null;
  balance: number;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  suspicious_at: string | null;
  is_banned: boolean;
  warning_message: string | null;
  total_transactions: number;
  reputation_score: number;
}

const SuspiciousUsersWidget = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [clearSuspiciousId, setClearSuspiciousId] = useState<string | null>(null);

  const { data: suspiciousUsers, isLoading, refetch } = useQuery({
    queryKey: ["suspicious-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_suspicious", true)
        .order("suspicious_at", { ascending: false });
      if (error) throw error;
      return data as SuspiciousUser[];
    },
  });

  const clearSuspicious = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspicious: false,
          suspicious_reason: null,
          suspicious_at: null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suspicious-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({ title: "Đã bỏ đánh dấu nghi vấn" });
      setClearSuspiciousId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  const filteredUsers = suspiciousUsers?.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.suspicious_reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              Tài khoản nghi vấn ({suspiciousUsers?.length || 0})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-48 text-sm"
                />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredUsers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Không có tài khoản nghi vấn</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Người dùng</TableHead>
                    <TableHead className="text-xs">Số dư</TableHead>
                    <TableHead className="text-xs">Lý do nghi vấn</TableHead>
                    <TableHead className="text-xs">Thời gian</TableHead>
                    <TableHead className="text-xs">Trạng thái</TableHead>
                    <TableHead className="text-xs w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs">
                        <div>
                          <p className="font-medium">{u.full_name || "Chưa đặt tên"}</p>
                          <p className="text-muted-foreground font-mono text-xs">
                            {u.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {formatCurrency(u.balance)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <p className="text-destructive line-clamp-2">{u.suspicious_reason}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.suspicious_at
                          ? format(new Date(u.suspicious_at), "dd/MM/yy HH:mm", { locale: vi })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {u.is_banned && (
                            <Badge variant="destructive" className="text-xs">
                              Bị ban
                            </Badge>
                          )}
                          {u.warning_message && (
                            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">
                              Cảnh báo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setClearSuspiciousId(u.user_id)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Bỏ dấu
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Clear Suspicious */}
      <Dialog open={!!clearSuspiciousId} onOpenChange={() => setClearSuspiciousId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bỏ đánh dấu nghi vấn</DialogTitle>
            <DialogDescription>
              Xác nhận tài khoản này đã được kiểm tra và không có vấn đề?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearSuspiciousId(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => clearSuspiciousId && clearSuspicious.mutate(clearSuspiciousId)}
              disabled={clearSuspicious.isPending}
            >
              {clearSuspicious.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SuspiciousUsersWidget;
