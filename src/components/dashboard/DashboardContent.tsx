import { memo, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransactionCard } from "@/components/TransactionCard";
import { TransactionCardSkeleton } from "@/components/skeletons/TransactionCardSkeleton";
import { DepositListSkeleton } from "@/components/skeletons/DepositListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Wallet, Package, CreditCard, ArrowDownToLine, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Lazy load heavy components
const DashboardRoomMap = lazy(() => import("@/components/DashboardRoomMap"));
const ModeratorsList = lazy(() => import("@/components/ModeratorsList"));
const PublicTransactionLog = lazy(() => import("@/components/dashboard/PublicTransactionLog"));

// Memoized Tet Banner
const TetBanner = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-4 p-3 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center gap-3"
  >
    <span className="text-3xl">🐴</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">🎊 Chúc Mừng Năm Mới 2026</p>
      <p className="text-xs text-muted-foreground">Năm Bính Ngọ — Chúc bạn giao dịch thuận lợi!</p>
    </div>
  </motion.div>
));
TetBanner.displayName = "TetBanner";

// Memoized Action Buttons
const ActionButtons = memo(({ navigate }: { navigate: (path: string) => void }) => (
  <div className="flex flex-wrap gap-2 mb-6">
    <Button onClick={() => navigate("/create-transaction")} className="tet-btn-primary">
      <Plus className="w-4 h-4 mr-2" />
      Tạo giao dịch
    </Button>
    <Button variant="outline" onClick={() => navigate("/deposit")} className="tet-btn-outline">
      <Wallet className="w-4 h-4 mr-2" />
      Nạp tiền
    </Button>
    <Button variant="outline" onClick={() => navigate("/withdraw")} className="tet-btn-outline">
      <ArrowDownToLine className="w-4 h-4 mr-2" />
      Rút tiền
    </Button>
  </div>
));
ActionButtons.displayName = "ActionButtons";

// Loading fallback for lazy components
const SectionSkeleton = memo(() => (
  <Card className="border-border">
    <CardContent className="py-8">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-8 w-8 bg-muted rounded-full" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    </CardContent>
  </Card>
));
SectionSkeleton.displayName = "SectionSkeleton";

// Memoized Deposit Item
const DepositItem = memo(({ deposit, formatCurrency }: { 
  deposit: { id: string; amount: number; payment_method: string; status: string; created_at: string };
  formatCurrency: (amount: number) => string;
}) => (
  <div className="flex items-center justify-between p-4">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-full bg-primary/10">
        <Wallet className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="font-medium">{formatCurrency(deposit.amount)}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {deposit.payment_method === "bank" ? "Chuyển khoản" : deposit.payment_method}
        </p>
      </div>
    </div>
    <div className="text-right">
      <Badge
        variant={
          deposit.status === "completed"
            ? "default"
            : deposit.status === "pending"
            ? "secondary"
            : "destructive"
        }
        className="mb-1"
      >
        {deposit.status === "completed"
          ? "Thành công"
          : deposit.status === "pending"
          ? "Đang chờ"
          : "Đã hủy"}
      </Badge>
      <p className="text-xs text-muted-foreground">
        {format(new Date(deposit.created_at), "dd/MM/yyyy", { locale: vi })}
      </p>
    </div>
  </div>
));
DepositItem.displayName = "DepositItem";

const DashboardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();

  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ["user-deposits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const formatCurrency = useMemo(() => (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  }, []);

  // Memoized filtered transactions
  const { activeTransactions, completedTransactions } = useMemo(() => {
    const active = transactions?.filter(
      (t) => !["completed", "cancelled", "refunded"].includes(t.status)
    ) || [];
    const completed = transactions?.filter(
      (t) => ["completed", "cancelled", "refunded"].includes(t.status)
    ) || [];
    return { activeTransactions: active, completedTransactions: completed };
  }, [transactions]);

  return (
    <>
      {/* Tết 2026 Banner */}
      <TetBanner />

      {/* Actions */}
      <ActionButtons navigate={navigate} />

      {/* Room Map - Lazy loaded */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Suspense fallback={<SectionSkeleton />}>
          <DashboardRoomMap />
        </Suspense>
      </motion.section>

      {/* Active Transactions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-3">
          Giao dịch đang thực hiện ({activeTransactions.length})
        </h2>
        {transactionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <TransactionCardSkeleton key={i} />
            ))}
          </div>
        ) : activeTransactions.length === 0 ? (
          <Card className="border-border relative overflow-hidden">
            <span className="absolute bottom-2 right-2 text-4xl opacity-[0.1] pointer-events-none">🐴</span>
            <CardContent className="py-8 text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Chưa có giao dịch nào</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/create-transaction")}
              >
                Tạo giao dịch đầu tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTransactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </motion.section>

      {/* Deposit History */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Lịch sử nạp tiền
        </h2>
        {depositsLoading ? (
          <DepositListSkeleton />
        ) : !deposits || deposits.length === 0 ? (
          <Card className="border-border relative overflow-hidden">
            <span className="absolute bottom-2 right-2 text-4xl opacity-[0.1] pointer-events-none scale-x-[-1]">🐴</span>
            <CardContent className="py-6 text-center">
              <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Chưa có lịch sử nạp tiền</p>
              <Button variant="link" size="sm" onClick={() => navigate("/deposit")}>
                Nạp tiền ngay
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden">
            <span className="absolute bottom-2 right-2 text-4xl opacity-[0.08] pointer-events-none">🐴</span>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {deposits.map((d) => (
                  <DepositItem key={d.id} deposit={d} formatCurrency={formatCurrency} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.section>

      {/* Public Transaction Log - Lazy loaded */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Suspense fallback={<SectionSkeleton />}>
          <PublicTransactionLog />
        </Suspense>
      </motion.section>

      {/* Moderators List - Lazy loaded */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Suspense fallback={<SectionSkeleton />}>
          <ModeratorsList variant="compact" maxItems={3} />
        </Suspense>
      </motion.section>

      {/* Completed Transactions */}
      {completedTransactions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Lịch sử giao dịch ({completedTransactions.length})
            </h2>
            {completedTransactions.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/transaction-history")}
                className="text-muted-foreground hover:text-foreground"
              >
                Xem tất cả
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {completedTransactions.slice(0, 3).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </motion.section>
      )}
    </>
  );
};

export default memo(DashboardContent);
