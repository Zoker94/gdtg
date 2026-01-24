import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAllTransactions, useUpdateTransactionStatus, TransactionStatus } from "@/hooks/useTransactions";
import { useUserRole } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  Users,
  DollarSign,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const statusConfig: Record<TransactionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Chờ thanh toán", variant: "secondary" },
  deposited: { label: "Đã đặt cọc", variant: "default" },
  shipping: { label: "Đang giao", variant: "default" },
  completed: { label: "Hoàn tất", variant: "outline" },
  disputed: { label: "Khiếu nại", variant: "destructive" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
  refunded: { label: "Hoàn tiền", variant: "secondary" },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useUserRole();
  const { data: transactions, isLoading, refetch } = useAllTransactions();
  const updateStatus = useUpdateTransactionStatus();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "refund" | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const isAdmin = roles?.includes("admin");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-20 w-40" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">Truy cập bị từ chối</p>
            <p className="text-muted-foreground mb-4">Bạn không có quyền truy cập trang này</p>
            <Button onClick={() => navigate("/dashboard")}>Về Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const filteredTransactions = transactions?.filter(
    (t) =>
      t.transaction_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const disputedTransactions = transactions?.filter((t) => t.status === "disputed") || [];
  const totalVolume = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalFees = transactions?.reduce((sum, t) => sum + Number(t.platform_fee_amount), 0) || 0;

  const handleResolve = () => {
    if (!selectedTransaction) return;
    updateStatus.mutate({
      transactionId: selectedTransaction,
      status: "completed",
    });
    setSelectedTransaction(null);
    setActionType(null);
    toast({ title: "Đã giải quyết khiếu nại - Hoàn tất giao dịch" });
  };

  const handleRefund = () => {
    if (!selectedTransaction) return;
    updateStatus.mutate({
      transactionId: selectedTransaction,
      status: "refunded",
    });
    setSelectedTransaction(null);
    setActionType(null);
    toast({ title: "Đã hoàn tiền cho người mua" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">EscrowVN</span>
            <Badge variant="destructive">Admin</Badge>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Về Dashboard
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-8">Quản trị hệ thống</h1>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                    <p className="text-2xl font-bold">{transactions?.length || 0}</p>
                  </div>
                  <Package className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Khiếu nại</p>
                    <p className="text-2xl font-bold text-destructive">{disputedTransactions.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Khối lượng GD</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalVolume)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng phí thu</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalFees)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Disputes Section */}
          {disputedTransactions.length > 0 && (
            <Card className="glass border-destructive/50 mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Khiếu nại cần xử lý ({disputedTransactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {disputedTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{t.product_name}</p>
                          <p className="text-sm text-muted-foreground">{t.transaction_code}</p>
                          <p className="text-sm mt-2">
                            <strong>Lý do:</strong> {t.dispute_reason || "Không có"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Số tiền: {formatCurrency(t.amount)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(t.id);
                              setActionType("resolve");
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Hoàn tất
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedTransaction(t.id);
                              setActionType("refund");
                            }}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Hoàn tiền
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Transactions */}
          <Card className="glass">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Tất cả giao dịch</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã GD</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Số tiền</TableHead>
                        <TableHead>Phí</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions?.map((t) => (
                        <TableRow
                          key={t.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/transaction/${t.id}`)}
                        >
                          <TableCell className="font-mono text-sm">{t.transaction_code}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{t.product_name}</TableCell>
                          <TableCell>{formatCurrency(t.amount)}</TableCell>
                          <TableCell className="text-destructive">
                            {formatCurrency(t.platform_fee_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[t.status].variant}>
                              {statusConfig[t.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(t.created_at), "dd/MM/yyyy", { locale: vi })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Confirmation Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "resolve" ? "Xác nhận hoàn tất giao dịch" : "Xác nhận hoàn tiền"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "resolve"
                  ? "Tiền sẽ được giải ngân cho người bán. Hành động này không thể hoàn tác."
                  : "Tiền sẽ được hoàn trả cho người mua. Hành động này không thể hoàn tác."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionType(null)}>
                Hủy
              </Button>
              <Button
                variant={actionType === "resolve" ? "default" : "destructive"}
                onClick={actionType === "resolve" ? handleResolve : handleRefund}
              >
                {actionType === "resolve" ? "Hoàn tất" : "Hoàn tiền"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
