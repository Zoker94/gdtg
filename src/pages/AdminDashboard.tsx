import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Wallet,
  Clock,
  CreditCard,
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
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useUserRole();
  const { data: transactions, isLoading, refetch } = useAllTransactions();
  const updateStatus = useUpdateTransactionStatus();

  const [searchQuery, setSearchQuery] = useState("");
  const [depositSearchQuery, setDepositSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "refund" | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("transactions");

  // Fetch all deposits (admin only)
  const { data: deposits, isLoading: depositsLoading, refetch: refetchDeposits } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Confirm deposit mutation
  const confirmDeposit = useMutation({
    mutationFn: async (depositId: string) => {
      const { error } = await supabase.rpc("confirm_deposit", { deposit_id: depositId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      toast({ title: "Đã xác nhận nạp tiền thành công!" });
      setSelectedDeposit(null);
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
                    <p className="text-sm text-muted-foreground">Nạp tiền chờ</p>
                    <p className="text-2xl font-bold text-warning">
                      {deposits?.filter((d) => d.status === "pending").length || 0}
                    </p>
                  </div>
                  <Wallet className="w-8 h-8 text-warning" />
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

          {/* Tabs for Transactions and Deposits */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Giao dịch
              </TabsTrigger>
              <TabsTrigger value="deposits" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Nạp tiền
                {deposits?.filter((d) => d.status === "pending").length ? (
                  <Badge variant="destructive" className="ml-1">
                    {deposits.filter((d) => d.status === "pending").length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-4">
              {/* Disputes Section */}
              {disputedTransactions.length > 0 && (
                <Card className="glass border-destructive/50">
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
            </TabsContent>

            {/* Deposits Tab */}
            <TabsContent value="deposits" className="space-y-4">
              {/* Pending Deposits */}
              {deposits?.filter((d) => d.status === "pending").length ? (
                <Card className="glass border-warning/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-warning">
                      <Clock className="w-5 h-5" />
                      Yêu cầu nạp tiền chờ xác nhận ({deposits.filter((d) => d.status === "pending").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deposits
                        .filter((d) => d.status === "pending")
                        .map((d) => (
                          <div
                            key={d.id}
                            className="p-4 rounded-lg bg-warning/5 border border-warning/20"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-lg">{formatCurrency(d.amount)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {d.payment_method === "bank" ? "Chuyển khoản ngân hàng" : d.payment_method}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Nội dung CK: <span className="font-mono font-semibold">NAP {d.id.slice(0, 8).toUpperCase()}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Ngày tạo: {format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  User ID: <span className="font-mono">{d.user_id.slice(0, 8)}...</span>
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => setSelectedDeposit(d.id)}
                                disabled={confirmDeposit.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Xác nhận
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* All Deposits */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg">Tất cả yêu cầu nạp tiền</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm..."
                          value={depositSearchQuery}
                          onChange={(e) => setDepositSearchQuery(e.target.value)}
                          className="pl-9 w-64"
                        />
                      </div>
                      <Button variant="outline" size="icon" onClick={() => refetchDeposits()}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {depositsLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã nạp</TableHead>
                            <TableHead>Số tiền</TableHead>
                            <TableHead>Phương thức</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead>Xác nhận</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deposits
                            ?.filter((d) =>
                              d.id.toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
                              d.payment_method.toLowerCase().includes(depositSearchQuery.toLowerCase())
                            )
                            .map((d) => (
                              <TableRow key={d.id}>
                                <TableCell className="font-mono text-sm">
                                  NAP {d.id.slice(0, 8).toUpperCase()}
                                </TableCell>
                                <TableCell className="font-semibold">{formatCurrency(d.amount)}</TableCell>
                                <TableCell className="capitalize">
                                  {d.payment_method === "bank" ? "Ngân hàng" : d.payment_method}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      d.status === "completed"
                                        ? "default"
                                        : d.status === "pending"
                                        ? "secondary"
                                        : "destructive"
                                    }
                                  >
                                    {d.status === "completed"
                                      ? "Đã xác nhận"
                                      : d.status === "pending"
                                      ? "Chờ xác nhận"
                                      : "Đã hủy"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {d.confirmed_at
                                    ? format(new Date(d.confirmed_at), "dd/MM/yyyy HH:mm", { locale: vi })
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Confirmation Dialog for Transactions */}
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

        {/* Confirmation Dialog for Deposits */}
        <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận nạp tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn đã nhận được tiền chuyển khoản từ người dùng? Số tiền sẽ được cộng vào tài khoản của họ.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDeposit(null)}>
                Hủy
              </Button>
              <Button
                onClick={() => selectedDeposit && confirmDeposit.mutate(selectedDeposit)}
                disabled={confirmDeposit.isPending}
              >
                {confirmDeposit.isPending ? "Đang xử lý..." : "Xác nhận đã nhận tiền"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
