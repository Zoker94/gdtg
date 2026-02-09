import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ShieldBan, Plus, Trash2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import SimplePagination, { paginateData, getTotalPages } from "@/components/ui/simple-pagination";

interface BannedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  banned_by: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

const BannedIPsWidget = () => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data: bannedIps, isLoading } = useQuery({
    queryKey: ["banned-ips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_ips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BannedIP[];
    },
  });

  const addBannedIp = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      const { error } = await supabase.from("banned_ips").insert({
        ip_address: ip,
        reason: reason || null,
        banned_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banned-ips"] });
      toast({ title: "Đã ban IP thành công!" });
      setShowAddDialog(false);
      setNewIp("");
      setNewReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const removeBannedIp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banned_ips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banned-ips"] });
      toast({ title: "Đã gỡ ban IP!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const toggleBannedIp = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("banned_ips")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banned-ips"] });
      toast({ title: "Đã cập nhật trạng thái!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const filtered = bannedIps?.filter(
    (ip) =>
      ip.ip_address.includes(searchQuery) ||
      ip.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBanIpFromUsers = (ip: string) => {
    setNewIp(ip);
    setShowAddDialog(true);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldBan className="w-4 h-4" /> Quản lý IP bị ban
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-40 text-sm font-mono"
              />
            </div>
            <Button size="sm" className="h-8 gap-1" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Ban IP
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : filtered?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có IP nào bị ban
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Địa chỉ IP</TableHead>
                  <TableHead className="text-xs">Lý do</TableHead>
                  <TableHead className="text-xs">Trạng thái</TableHead>
                  <TableHead className="text-xs">Ngày ban</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginateData(filtered || [], page).map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {ip.ip_address}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {ip.reason || <span className="text-muted-foreground italic">Không có lý do</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => toggleBannedIp.mutate({ id: ip.id, isActive: !ip.is_active })}
                      >
                        <Badge
                          variant={ip.is_active ? "destructive" : "secondary"}
                          className="text-xs cursor-pointer"
                        >
                          {ip.is_active ? "Đang ban" : "Đã tắt"}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(ip.created_at), "dd/MM/yy HH:mm", { locale: vi })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeBannedIp.mutate(ip.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <SimplePagination
              currentPage={page}
              totalPages={getTotalPages(filtered?.length || 0)}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>

      {/* Add Banned IP Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban địa chỉ IP</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nhập địa chỉ IP (VD: 192.168.1.1)"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="font-mono"
            />
            <Textarea
              placeholder="Lý do ban (tuỳ chọn)"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() => addBannedIp.mutate({ ip: newIp, reason: newReason })}
              disabled={!newIp.trim() || addBannedIp.isPending}
            >
              Ban IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BannedIPsWidget;
