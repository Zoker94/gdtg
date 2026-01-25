import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionCard } from "@/components/TransactionCard";
import { useTransactions } from "@/hooks/useTransactions";
import { ArrowLeft, Package } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { data: transactions, isLoading } = useTransactions();

  const completedTransactions = transactions?.filter(
    (t) => ["completed", "cancelled", "refunded"].includes(t.status)
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Lịch sử giao dịch</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : completedTransactions?.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Chưa có lịch sử giao dịch</p>
              <Button
                variant="link"
                onClick={() => navigate("/dashboard")}
                className="mt-2"
              >
                Quay lại Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {completedTransactions?.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TransactionHistory;
