import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useAllTransactions, useUpdateTransactionStatus, TransactionStatus } from "@/hooks/useTransactions";
import { useUserRole } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Package,
  DollarSign,
  LogOut,
  Wallet,
  Clock,
  CreditCard,
  Users,
  Megaphone,
  Trash2,
  Ban,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  useAllUsers,
  useBanUser,
  useUnbanUser,
  useSetWarning,
  useDeleteTransaction,
  useDeleteDeposit,
} from "@/hooks/useAdminActions";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useToggleAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/useAnnouncements";
import AnnouncementBanner from "@/components/AnnouncementBanner";

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
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "refund" | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("transactions");

  // Delete dialogs
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [deleteDepositId, setDeleteDepositId] = useState<string | null>(null);

  // User management
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [warningUserId, setWarningUserId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState("");

  // Announcement
  const [newAnnouncement, setNewAnnouncement] = useState("");

  // Hooks
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

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useAllUsers();
  const { data: announcements, isLoading: announcementsLoading, refetch: refetchAnnouncements } = useAnnouncements();

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

  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const setWarning = useSetWarning();
  const deleteTransaction = useDeleteTransaction();
  const deleteDeposit = useDeleteDeposit();
  const createAnnouncement = useCreateAnnouncement();
  const toggleAnnouncement = useToggleAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

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
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const filteredTransactions = transactions?.filter(
    (t) =>
      t.transaction_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users?.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.user_id.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const disputedTransactions = transactions?.filter((t) => t.status === "disputed") || [];
  const totalVolume = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalFees = transactions?.reduce((sum, t) => sum + Number(t.platform_fee_amount), 0) || 0;

  const handleResolve = () => {
    if (!selectedTransaction) return;
    updateStatus.mutate({ transactionId: selectedTransaction, status: "completed" });
    setSelectedTransaction(null);
    setActionType(null);
    toast({ title: "Đã giải quyết khiếu nại - Hoàn tất giao dịch" });
  };

  const handleRefund = () => {
    if (!selectedTransaction) return;
    updateStatus.mutate({ transactionId: selectedTransaction, status: "refunded" });
    setSelectedTransaction(null);
    setActionType(null);
    toast({ title: "Đã hoàn tiền cho người mua" });
  };

  const handleBanUser = () => {
    if (!banUserId || !banReason) return;
    banUser.mutate({ userId: banUserId, reason: banReason });
    setBanUserId(null);
    setBanReason("");
  };

  const handleSetWarning = () => {
    if (!warningUserId) return;
    setWarning.mutate({ userId: warningUserId, warning: warningMessage || null });
    setWarningUserId(null);
    setWarningMessage("");
  };

  const handleCreateAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    createAnnouncement.mutate({ content: newAnnouncement });
    setNewAnnouncement("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-base">EscrowVN</span>
            <Badge variant="destructive" className="text-xs">Admin</Badge>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <AnnouncementBanner />

      <main className="container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold mb-6">Quản trị hệ thống</h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Giao dịch</p>
                    <p className="text-xl font-bold">{transactions?.length || 0}</p>
                  </div>
                  <Package className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Khiếu nại</p>
                    <p className="text-xl font-bold text-destructive">{disputedTransactions.length}</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Nạp chờ</p>
                    <p className="text-xl font-bold text-amber-500">{deposits?.filter((d) => d.status === "pending").length || 0}</p>
                  </div>
                  <Wallet className="w-6 h-6 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Khối lượng</p>
                    <p className="text-lg font-bold">{formatCurrency(totalVolume)}</p>
                  </div>
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Phí thu</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(totalFees)}</p>
                  </div>
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="transactions" className="text-xs">
                <Package className="w-3.5 h-3.5 mr-1" /> Giao dịch
              </TabsTrigger>
              <TabsTrigger value="deposits" className="text-xs">
                <Wallet className="w-3.5 h-3.5 mr-1" /> Nạp tiền
                {deposits?.filter((d) => d.status === "pending").length ? (
                  <Badge variant="destructive" className="ml-1 text-xs px-1">{deposits.filter((d) => d.status === "pending").length}</Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs">
                <Users className="w-3.5 h-3.5 mr-1" /> Người dùng
              </TabsTrigger>
              <TabsTrigger value="announcements" className="text-xs">
                <Megaphone className="w-3.5 h-3.5 mr-1" /> Thông báo
              </TabsTrigger>
            </TabsList>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-4">
              {/* Disputes */}
              {disputedTransactions.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Khiếu nại ({disputedTransactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {disputedTransactions.map((t) => (
                        <div key={t.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm">{t.product_name}</p>
                              <p className="text-xs text-muted-foreground">{t.transaction_code}</p>
                              <p className="text-xs mt-1">Lý do: {t.dispute_reason || "Không có"}</p>
                              <p className="text-xs text-muted-foreground">Số tiền: {formatCurrency(t.amount)}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs" onClick={() => { setSelectedTransaction(t.id); setActionType("resolve"); }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Hoàn tất
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setSelectedTransaction(t.id); setActionType("refund"); }}>
                                <RefreshCw className="w-3 h-3 mr-1" /> Hoàn tiền
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
              <Card>
                <CardHeader className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base">Tất cả giao dịch</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? <Skeleton className="h-32 w-full" /> : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Mã GD</TableHead>
                            <TableHead className="text-xs">Sản phẩm</TableHead>
                            <TableHead className="text-xs">Số tiền</TableHead>
                            <TableHead className="text-xs">Trạng thái</TableHead>
                            <TableHead className="text-xs">Ngày</TableHead>
                            <TableHead className="text-xs w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions?.map((t) => (
                            <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/transaction/${t.id}`)}>
                              <TableCell className="font-mono text-xs">{t.transaction_code}</TableCell>
                              <TableCell className="max-w-[150px] truncate text-xs">{t.product_name}</TableCell>
                              <TableCell className="text-xs">{formatCurrency(t.amount)}</TableCell>
                              <TableCell><Badge variant={statusConfig[t.status].variant} className="text-xs">{statusConfig[t.status].label}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd/MM/yy", { locale: vi })}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeleteTransactionId(t.id); }}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
            </TabsContent>

            {/* Deposits Tab */}
            <TabsContent value="deposits" className="space-y-4">
              {deposits?.filter((d) => d.status === "pending").length ? (
                <Card className="border-amber-500/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-500">
                      <Clock className="w-4 h-4" />
                      Chờ xác nhận ({deposits.filter((d) => d.status === "pending").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {deposits.filter((d) => d.status === "pending").map((d) => (
                        <div key={d.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{formatCurrency(d.amount)}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <CreditCard className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{d.payment_method === "bank" ? "Chuyển khoản" : d.payment_method}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Nội dung: <span className="font-mono">NAP {d.id.slice(0, 8).toUpperCase()}</span></p>
                            </div>
                            <Button size="sm" className="h-7 text-xs" onClick={() => setSelectedDeposit(d.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Xác nhận
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Tất cả nạp tiền</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Tìm..." value={depositSearchQuery} onChange={(e) => setDepositSearchQuery(e.target.value)} className="pl-8 h-8 w-40 text-sm" />
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchDeposits()}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {depositsLoading ? <Skeleton className="h-32 w-full" /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Mã</TableHead>
                          <TableHead className="text-xs">Số tiền</TableHead>
                          <TableHead className="text-xs">Trạng thái</TableHead>
                          <TableHead className="text-xs">Ngày</TableHead>
                          <TableHead className="text-xs w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deposits?.filter((d) => d.id.includes(depositSearchQuery) || d.payment_method.includes(depositSearchQuery)).map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs">NAP {d.id.slice(0, 8).toUpperCase()}</TableCell>
                            <TableCell className="font-semibold text-xs">{formatCurrency(d.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={d.status === "completed" ? "default" : d.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                                {d.status === "completed" ? "Đã xác nhận" : d.status === "pending" ? "Chờ" : "Hủy"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yy", { locale: vi })}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDepositId(d.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Quản lý người dùng</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Tìm..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchUsers()}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {usersLoading ? <Skeleton className="h-32 w-full" /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Tên</TableHead>
                          <TableHead className="text-xs">Số dư</TableHead>
                          <TableHead className="text-xs">GD</TableHead>
                          <TableHead className="text-xs">Uy tín</TableHead>
                          <TableHead className="text-xs">Trạng thái</TableHead>
                          <TableHead className="text-xs w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers?.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="text-xs">
                              <div>
                                <p className="font-medium">{u.full_name || "Chưa đặt tên"}</p>
                                <p className="text-muted-foreground font-mono text-xs">{u.user_id.slice(0, 8)}...</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{formatCurrency(u.balance)}</TableCell>
                            <TableCell className="text-xs">{u.total_transactions}</TableCell>
                            <TableCell className="text-xs">{u.reputation_score}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {u.is_banned && <Badge variant="destructive" className="text-xs">Bị ban</Badge>}
                                {u.warning_message && <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">Cảnh báo</Badge>}
                                {!u.is_banned && !u.warning_message && <Badge variant="secondary" className="text-xs">Bình thường</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {u.is_banned ? (
                                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => unbanUser.mutate(u.user_id)}>
                                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBanUserId(u.user_id)}>
                                    <Ban className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWarningUserId(u.user_id); setWarningMessage(u.warning_message || ""); }}>
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="w-4 h-4" /> Đăng thông báo mới
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nội dung thông báo (sẽ chạy chữ đỏ dưới header)..."
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleCreateAnnouncement} disabled={createAnnouncement.isPending || !newAnnouncement.trim()}>
                      Đăng
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Danh sách thông báo</CardTitle>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchAnnouncements()}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {announcementsLoading ? <Skeleton className="h-20 w-full" /> : announcements?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Chưa có thông báo nào</p>
                  ) : (
                    <div className="space-y-2">
                      {announcements?.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1">
                            <p className="text-sm">{a.content}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={a.is_active ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => toggleAnnouncement.mutate({ id: a.id, is_active: !a.is_active })}
                            >
                              {a.is_active ? "Đang hiển thị" : "Đã tắt"}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAnnouncement.mutate(a.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Dialog: Resolve/Refund Transaction */}
        <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionType === "resolve" ? "Xác nhận hoàn tất" : "Xác nhận hoàn tiền"}</DialogTitle>
              <DialogDescription>
                {actionType === "resolve" ? "Tiền sẽ được giải ngân cho người bán." : "Tiền sẽ được hoàn trả cho người mua."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionType(null)}>Hủy</Button>
              <Button variant={actionType === "resolve" ? "default" : "destructive"} onClick={actionType === "resolve" ? handleResolve : handleRefund}>
                {actionType === "resolve" ? "Hoàn tất" : "Hoàn tiền"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Confirm Deposit */}
        <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận nạp tiền</DialogTitle>
              <DialogDescription>Bạn có chắc chắn đã nhận được tiền?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDeposit(null)}>Hủy</Button>
              <Button onClick={() => selectedDeposit && confirmDeposit.mutate(selectedDeposit)} disabled={confirmDeposit.isPending}>
                {confirmDeposit.isPending ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Delete Transaction */}
        <Dialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xoá giao dịch</DialogTitle>
              <DialogDescription>Hành động này không thể hoàn tác. Bạn có chắc chắn?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTransactionId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={() => { deleteTransaction.mutate(deleteTransactionId!); setDeleteTransactionId(null); }}>
                Xoá
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Delete Deposit */}
        <Dialog open={!!deleteDepositId} onOpenChange={() => setDeleteDepositId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xoá lịch sử nạp tiền</DialogTitle>
              <DialogDescription>Hành động này không thể hoàn tác.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDepositId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={() => { deleteDeposit.mutate(deleteDepositId!); setDeleteDepositId(null); }}>
                Xoá
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Ban User */}
        <Dialog open={!!banUserId} onOpenChange={() => setBanUserId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban người dùng</DialogTitle>
              <DialogDescription>Người dùng sẽ không thể truy cập hệ thống.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea placeholder="Lý do ban..." value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanUserId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={handleBanUser} disabled={!banReason.trim()}>
                Ban
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Set Warning */}
        <Dialog open={!!warningUserId} onOpenChange={() => setWarningUserId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gắn cảnh báo</DialogTitle>
              <DialogDescription>Cảnh báo sẽ hiển thị trên hồ sơ người dùng. Để trống để xoá cảnh báo.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea placeholder="Nội dung cảnh báo..." value={warningMessage} onChange={(e) => setWarningMessage(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWarningUserId(null)}>Hủy</Button>
              <Button onClick={handleSetWarning}>
                {warningMessage ? "Cập nhật" : "Xoá cảnh báo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
