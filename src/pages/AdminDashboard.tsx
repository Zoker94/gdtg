import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
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
  LogOut,
  Users,
  Megaphone,
  Trash2,
  Ban,
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  Settings,
  IdCard,
  DollarSign,
  ShieldAlert,
  Menu,
  LayoutDashboard,
  Snowflake,
  History,
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
  useFreezeBalance,
} from "@/hooks/useAdminActions";
import {
  useAllWithdrawals,
  useConfirmWithdrawal,
  useRejectWithdrawal,
  useDeleteWithdrawal,
  useHoldWithdrawal,
} from "@/hooks/useWithdrawals";
import { useRiskAlerts } from "@/hooks/useRiskAlerts";
import { useAdjustBalance } from "@/hooks/useAdminBalance";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useToggleAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/useAnnouncements";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import AdminStatsGrid from "@/components/admin/AdminStatsGrid";
import PendingWithdrawalsWidget from "@/components/admin/PendingWithdrawalsWidget";
import PendingDepositsWidget from "@/components/admin/PendingDepositsWidget";
import DisputesWidget from "@/components/admin/DisputesWidget";
import PlatformSettingsWidget from "@/components/admin/PlatformSettingsWidget";
import RoleManagementWidget from "@/components/admin/RoleManagementWidget";
import ModeratorManagementWidget from "@/components/admin/ModeratorManagementWidget";
import AdminBankSettingsWidget from "@/components/admin/AdminBankSettingsWidget";
import KYCManagementWidget from "@/components/admin/KYCManagementWidget";
import RiskAlertsWidget from "@/components/admin/RiskAlertsWidget";
import SuspiciousUsersWidget from "@/components/admin/SuspiciousUsersWidget";
import AdminActionLogsWidget from "@/components/admin/AdminActionLogsWidget";
import SimplePagination, { paginateData, getTotalPages } from "@/components/ui/simple-pagination";

const statusConfig: Record<TransactionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Chờ thanh toán", variant: "secondary" },
  deposited: { label: "Đã đặt cọc", variant: "default" },
  shipping: { label: "Đang giao", variant: "default" },
  completed: { label: "Hoàn tất", variant: "outline" },
  disputed: { label: "Khiếu nại", variant: "destructive" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
  refunded: { label: "Hoàn tiền", variant: "secondary" },
};

const menuItems = [
  { title: "Tổng quan", value: "overview", icon: LayoutDashboard },
  { title: "Người dùng", value: "users", icon: Users },
  { title: "Nghi vấn", value: "suspicious", icon: ShieldAlert },
  { title: "KYC", value: "kyc", icon: IdCard },
  { title: "Rút tiền", value: "withdrawals", icon: ArrowDownToLine },
  { title: "Thông báo", value: "announcements", icon: Megaphone },
  { title: "Lịch sử", value: "history", icon: History },
  { title: "Cài đặt", value: "settings", icon: Settings },
];

const AdminSidebar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar/95 backdrop-blur-sm">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-border/50 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
          <Shield className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">Admin Panel</span>
            <span className="text-xs text-muted-foreground">Quản trị hệ thống</span>
          </div>
        )}
      </div>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-1">
              Menu chính
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.value;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setActiveTab(item.value)}
                      tooltip={item.title}
                      className={`cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground" 
                          : "hover:bg-muted/80"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "" : "text-muted-foreground"}`} />
                      <span className={`font-medium ${isActive ? "" : "text-foreground/80"}`}>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <div className={`mt-auto border-t border-border/50 p-3 ${collapsed ? "px-2" : ""}`}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={() => navigate("/dashboard")}
          className={`w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 ${collapsed ? "justify-center" : ""}`}
        >
          <ArrowLeft className="w-4 h-4" />
          {!collapsed && <span className="text-sm">Về Dashboard</span>}
        </Button>
      </div>
    </Sidebar>
  );
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
  const [activeTab, setActiveTab] = useState("overview");

  // Delete dialogs
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [deleteDepositId, setDeleteDepositId] = useState<string | null>(null);
  const [deleteWithdrawalId, setDeleteWithdrawalId] = useState<string | null>(null);

  // User management
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [warningUserId, setWarningUserId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState("");

  // Announcement
  const [newAnnouncement, setNewAnnouncement] = useState("");

  // Withdrawal management
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(null);
  const [rejectWithdrawalId, setRejectWithdrawalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Balance adjustment
  const [adjustBalanceUserId, setAdjustBalanceUserId] = useState<string | null>(null);
  const [adjustBalanceAmount, setAdjustBalanceAmount] = useState("");
  const [adjustBalanceNote, setAdjustBalanceNote] = useState("");
  const [adjustBalanceUserName, setAdjustBalanceUserName] = useState("");

  // Freeze balance
  const [freezeBalanceUserId, setFreezeBalanceUserId] = useState<string | null>(null);
  const [freezeBalanceReason, setFreezeBalanceReason] = useState("");

  // Pagination states
  const [transactionPage, setTransactionPage] = useState(1);
  const [depositPage, setDepositPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);

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
  const { data: withdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useAllWithdrawals();
  const { data: riskAlerts } = useRiskAlerts();

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
  const confirmWithdrawal = useConfirmWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const deleteWithdrawal = useDeleteWithdrawal();
  const holdWithdrawal = useHoldWithdrawal();
  const adjustBalance = useAdjustBalance();
  const freezeBalance = useFreezeBalance();

  const isAdmin = roles?.isAdmin;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
      navigate("/");
    }
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
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
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

  const pendingDepositsCount = deposits?.filter((d) => d.status === "pending").length || 0;
  const pendingWithdrawalsCount = withdrawals?.filter((w) => w.status === "pending" || (w.status as string) === "on_hold").length || 0;
  const unresolvedRiskAlerts = riskAlerts?.filter((r) => !r.is_resolved).length || 0;
  const hasPendingItems = pendingDepositsCount > 0 || pendingWithdrawalsCount > 0 || disputedTransactions.length > 0 || unresolvedRiskAlerts > 0;

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-4">
            {/* Quick Action Widgets */}
            {hasPendingItems && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <RiskAlertsWidget />
                <DisputesWidget
                  transactions={transactions || []}
                  onResolve={(id) => { setSelectedTransaction(id); setActionType("resolve"); }}
                  onRefund={(id) => { setSelectedTransaction(id); setActionType("refund"); }}
                  formatCurrency={formatCurrency}
                />
                <PendingWithdrawalsWidget
                  withdrawals={withdrawals || []}
                  onConfirm={(id) => setSelectedWithdrawal(id)}
                  onReject={(id) => setRejectWithdrawalId(id)}
                  onHold={(id) => holdWithdrawal.mutate({ withdrawalId: id })}
                  formatCurrency={formatCurrency}
                />
                <PendingDepositsWidget
                  deposits={deposits || []}
                  onConfirm={(id) => setSelectedDeposit(id)}
                  formatCurrency={formatCurrency}
                />
              </div>
            )}

            {/* All Transactions */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
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
                        {paginateData(filteredTransactions || [], transactionPage).map((t) => (
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
                    <SimplePagination
                      currentPage={transactionPage}
                      totalPages={getTotalPages(filteredTransactions?.length || 0)}
                      onPageChange={setTransactionPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Deposits */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Lịch sử nạp tiền</CardTitle>
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
                {depositsLoading ? <Skeleton className="h-32 w-full" /> : (() => {
                  const filteredDeposits = deposits?.filter((d) => d.id.includes(depositSearchQuery) || d.payment_method.includes(depositSearchQuery)) || [];
                  return (
                    <>
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
                          {paginateData(filteredDeposits, depositPage).map((d) => (
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
                      <SimplePagination
                        currentPage={depositPage}
                        totalPages={getTotalPages(filteredDeposits.length)}
                        onPageChange={setDepositPage}
                      />
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        );

      case "users":
        return (
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
                <>
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
                      {paginateData(filteredUsers || [], userPage).map((u) => (
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
                              {u.is_balance_frozen && <Badge className="text-xs bg-sky-500 text-white">Đóng băng</Badge>}
                              {u.warning_message && <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Cảnh báo</Badge>}
                              {!u.is_banned && !u.warning_message && !u.is_balance_frozen && <Badge variant="secondary" className="text-xs">Bình thường</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => { 
                                  setAdjustBalanceUserId(u.user_id); 
                                  setAdjustBalanceUserName(u.full_name || u.user_id.slice(0, 8));
                                  setAdjustBalanceAmount("");
                                  setAdjustBalanceNote("");
                                }}
                                title="Cộng/Trừ tiền"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-primary" />
                              </Button>
                              {u.is_balance_frozen ? (
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-7 w-7" 
                                  onClick={() => freezeBalance.mutate({ userId: u.user_id, freeze: false })}
                                  title="Gỡ đóng băng số dư"
                                >
                                  <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7" 
                                  onClick={() => { setFreezeBalanceUserId(u.user_id); setFreezeBalanceReason(""); }}
                                  title="Đóng băng số dư"
                                >
                                  <Snowflake className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              )}
                              {u.is_banned ? (
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => unbanUser.mutate(u.user_id)} title="Gỡ ban">
                                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBanUserId(u.user_id)} title="Ban tài khoản">
                                  <Ban className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWarningUserId(u.user_id); setWarningMessage(u.warning_message || ""); }} title="Gắn cảnh báo">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <SimplePagination
                    currentPage={userPage}
                    totalPages={getTotalPages(filteredUsers?.length || 0)}
                    onPageChange={setUserPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        );

      case "suspicious":
        return <SuspiciousUsersWidget />;

      case "kyc":
        return <KYCManagementWidget />;

      case "withdrawals":
        return (
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Tất cả yêu cầu rút tiền</CardTitle>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchWithdrawals()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {withdrawalsLoading ? <Skeleton className="h-32 w-full" /> : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Số tiền</TableHead>
                        <TableHead className="text-xs">Ngân hàng</TableHead>
                        <TableHead className="text-xs">Chủ TK</TableHead>
                        <TableHead className="text-xs">Trạng thái</TableHead>
                        <TableHead className="text-xs">Ngày</TableHead>
                        <TableHead className="text-xs w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginateData(withdrawals || [], withdrawalPage).map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-semibold text-xs">{formatCurrency(w.amount)}</TableCell>
                          <TableCell className="text-xs">{w.bank_name}</TableCell>
                          <TableCell className="text-xs">
                            <div>
                              <p>{w.bank_account_name}</p>
                              <p className="text-muted-foreground">{w.bank_account_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={w.status === "completed" ? "default" : w.status === "rejected" ? "destructive" : "secondary"} 
                              className="text-xs"
                            >
                              {w.status === "completed" ? "Đã chuyển" : w.status === "rejected" ? "Từ chối" : w.status === "on_hold" ? "Giữ lại" : "Chờ"}
                            </Badge>
                            {w.admin_note && w.status === "rejected" && (
                              <p className="text-xs text-destructive mt-1">{w.admin_note}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(w.created_at), "dd/MM/yy", { locale: vi })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteWithdrawalId(w.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <SimplePagination
                    currentPage={withdrawalPage}
                    totalPages={getTotalPages(withdrawals?.length || 0)}
                    onPageChange={setWithdrawalPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        );

      case "announcements":
        return (
          <div className="space-y-4">
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
          </div>
        );

      case "settings":
        return (
          <div className="space-y-4">
            <AdminBankSettingsWidget />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlatformSettingsWidget />
              <RoleManagementWidget />
            </div>
            <ModeratorManagementWidget />
          </div>
        );

      case "history":
        return (
          <div className="space-y-4">
            <AdminActionLogsWidget />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-8 w-8" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Link to="/" className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-display font-bold text-base hidden sm:inline">GDTG</span>
                  <Badge variant="destructive" className="text-xs">Admin</Badge>
                </Link>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </div>
          </header>

          <AnnouncementBanner />

          <main className="flex-1 p-4 overflow-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Stats Grid */}
              <AdminStatsGrid
                totalTransactions={transactions?.length || 0}
                disputedCount={disputedTransactions.length}
                pendingDeposits={pendingDepositsCount}
                pendingWithdrawals={pendingWithdrawalsCount}
                totalVolume={totalVolume}
                totalFees={totalFees}
                formatCurrency={formatCurrency}
              />

              {/* Content with tab transition */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Dialogs */}
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

            {/* Dialog: Freeze Balance */}
            <Dialog open={!!freezeBalanceUserId} onOpenChange={() => setFreezeBalanceUserId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Snowflake className="w-5 h-5 text-sky-500" />
                    Đóng băng số dư
                  </DialogTitle>
                  <DialogDescription>
                    Người dùng sẽ không thể rút tiền nhưng vẫn có thể đăng nhập và tham gia giao dịch.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea 
                    placeholder="Lý do đóng băng số dư..." 
                    value={freezeBalanceReason} 
                    onChange={(e) => setFreezeBalanceReason(e.target.value)} 
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFreezeBalanceUserId(null)}>Hủy</Button>
                  <Button 
                    onClick={() => { 
                      freezeBalance.mutate({ userId: freezeBalanceUserId!, freeze: true, reason: freezeBalanceReason }); 
                      setFreezeBalanceUserId(null); 
                    }} 
                    disabled={!freezeBalanceReason.trim()}
                    className="bg-sky-500 hover:bg-sky-600"
                  >
                    <Snowflake className="w-4 h-4 mr-2" />
                    Đóng băng
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

            {/* Dialog: Confirm Withdrawal */}
            <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xác nhận rút tiền</DialogTitle>
                  <DialogDescription>
                    Bạn xác nhận đã chuyển tiền cho người dùng? Số dư sẽ bị trừ.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>Hủy</Button>
                  <Button onClick={() => { confirmWithdrawal.mutate(selectedWithdrawal!); setSelectedWithdrawal(null); }} disabled={confirmWithdrawal.isPending}>
                    {confirmWithdrawal.isPending ? "Đang xử lý..." : "Xác nhận đã chuyển"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Reject Withdrawal */}
            <Dialog open={!!rejectWithdrawalId} onOpenChange={() => setRejectWithdrawalId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Từ chối rút tiền</DialogTitle>
                  <DialogDescription>Nhập lý do từ chối để thông báo cho người dùng.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea placeholder="Lý do từ chối..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectWithdrawalId(null)}>Hủy</Button>
                  <Button variant="destructive" onClick={() => { rejectWithdrawal.mutate({ withdrawalId: rejectWithdrawalId!, reason: rejectReason }); setRejectWithdrawalId(null); setRejectReason(""); }} disabled={!rejectReason.trim()}>
                    Từ chối
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Delete Withdrawal */}
            <Dialog open={!!deleteWithdrawalId} onOpenChange={() => setDeleteWithdrawalId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xoá yêu cầu rút tiền</DialogTitle>
                  <DialogDescription>Hành động này không thể hoàn tác.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteWithdrawalId(null)}>Hủy</Button>
                  <Button variant="destructive" onClick={() => { deleteWithdrawal.mutate(deleteWithdrawalId!); setDeleteWithdrawalId(null); }}>
                    Xoá
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Adjust Balance */}
            <Dialog open={!!adjustBalanceUserId} onOpenChange={() => setAdjustBalanceUserId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Điều chỉnh số dư</DialogTitle>
                  <DialogDescription>
                    Cộng hoặc trừ tiền cho tài khoản: <span className="font-semibold">{adjustBalanceUserName}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Số tiền (VND)</label>
                    <Input 
                      type="number" 
                      placeholder="VD: 100000 (cộng) hoặc -50000 (trừ)" 
                      value={adjustBalanceAmount} 
                      onChange={(e) => setAdjustBalanceAmount(e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Nhập số dương để cộng tiền, số âm để trừ tiền
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
                    <Textarea 
                      placeholder="Lý do điều chỉnh..." 
                      value={adjustBalanceNote} 
                      onChange={(e) => setAdjustBalanceNote(e.target.value)} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAdjustBalanceUserId(null)}>Hủy</Button>
                  <Button 
                    onClick={() => { 
                      const amount = parseFloat(adjustBalanceAmount);
                      if (isNaN(amount) || amount === 0) {
                        toast({ title: "Lỗi", description: "Vui lòng nhập số tiền hợp lệ", variant: "destructive" });
                        return;
                      }
                      adjustBalance.mutate({ 
                        userId: adjustBalanceUserId!, 
                        amount, 
                        note: adjustBalanceNote || undefined 
                      }); 
                      setAdjustBalanceUserId(null); 
                    }} 
                    disabled={adjustBalance.isPending || !adjustBalanceAmount}
                  >
                    {adjustBalance.isPending ? "Đang xử lý..." : "Xác nhận"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
