import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TransactionCard } from "@/components/TransactionCard";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Wallet, Package, CreditCard, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import DashboardHeader from "@/components/DashboardHeader";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import DashboardRoomMap from "@/components/DashboardRoomMap";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();

  // Fetch user's deposits
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
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  const activeTransactions = transactions?.filter(
    (t) => !["completed", "cancelled", "refunded"].includes(t.status)
  );
  const completedTransactions = transactions?.filter(
    (t) => ["completed", "cancelled", "refunded"].includes(t.status)
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <AnnouncementBanner />

      <main className="container mx-auto px-4 py-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={() => navigate("/create-transaction")} className="glow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Tạo giao dịch
          </Button>
          <Button variant="outline" onClick={() => navigate("/deposit")}>
            <Wallet className="w-4 h-4 mr-2" />
            Nạp tiền
          </Button>
          <Button variant="outline" onClick={() => navigate("/withdraw")}>
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Rút tiền
          </Button>
        </div>

        {/* Room Map */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <DashboardRoomMap />
        </motion.section>

        {/* Active Transactions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold mb-3">
            Giao dịch đang thực hiện ({activeTransactions?.length || 0})
          </h2>
          {transactionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : activeTransactions?.length === 0 ? (
            <Card className="border-border">
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
              {activeTransactions?.map((transaction) => (
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
            <Skeleton className="h-24" />
          ) : deposits?.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-6 text-center">
                <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Chưa có lịch sử nạp tiền</p>
                <Button variant="link" size="sm" onClick={() => navigate("/deposit")}>
                  Nạp tiền ngay
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {deposits?.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Wallet className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{formatCurrency(d.amount)}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {d.payment_method === "bank" ? "Chuyển khoản" : d.payment_method}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            d.status === "completed"
                              ? "default"
                              : d.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className="mb-1"
                        >
                          {d.status === "completed"
                            ? "Thành công"
                            : d.status === "pending"
                            ? "Đang chờ"
                            : "Đã hủy"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(d.created_at), "dd/MM/yyyy", { locale: vi })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.section>

        {/* Completed Transactions */}
        {completedTransactions && completedTransactions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-3">
              Lịch sử giao dịch ({completedTransactions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedTransactions.slice(0, 6).map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
