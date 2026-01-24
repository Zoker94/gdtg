import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionCard } from "@/components/TransactionCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransactions } from "@/hooks/useTransactions";
import {
  Plus,
  Wallet,
  TrendingUp,
  Package,
  LogOut,
  User,
  Shield,
  Settings,
} from "lucide-react";
import { useUserRole } from "@/hooks/useProfile";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: roles } = useUserRole();

  const isAdmin = roles?.includes("admin");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const stats = [
    {
      title: "Số dư ví",
      value: formatCurrency(profile?.balance || 0),
      icon: Wallet,
      color: "text-primary",
    },
    {
      title: "Tổng giao dịch",
      value: profile?.total_transactions || 0,
      icon: Package,
      color: "text-accent",
    },
    {
      title: "Điểm uy tín",
      value: profile?.reputation_score || 100,
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  const activeTransactions = transactions?.filter(
    (t) => !["completed", "cancelled", "refunded"].includes(t.status)
  );
  const completedTransactions = transactions?.filter(
    (t) => ["completed", "cancelled", "refunded"].includes(t.status)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">EscrowVN</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{profile?.full_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <Card key={stat.title} className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    {profileLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stat.value}</p>
                    )}
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button onClick={() => navigate("/create-transaction")} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Tạo giao dịch mới
          </Button>
        </div>

        {/* Active Transactions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-display font-semibold mb-4">
            Giao dịch đang thực hiện ({activeTransactions?.length || 0})
          </h2>
          {transactionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : activeTransactions?.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có giao dịch nào</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => navigate("/create-transaction")}
                >
                  Tạo giao dịch đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTransactions?.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Completed Transactions */}
        {completedTransactions && completedTransactions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-display font-semibold mb-4">
              Lịch sử giao dịch ({completedTransactions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
