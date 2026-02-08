import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicTransactions } from "@/hooks/usePublicTransactions";
import { Activity, ShoppingBag, CheckCircle, Truck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" }> = {
  deposited: { label: "Đã đặt cọc", icon: Clock, variant: "secondary" },
  shipping: { label: "Đang giao", icon: Truck, variant: "outline" },
  completed: { label: "Hoàn tất", icon: CheckCircle, variant: "default" },
};

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + "M";
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + "K";
  }
  return amount.toString();
};

// Memoized transaction item
const TransactionItem = memo(({ transaction, index }: { 
  transaction: {
    id: string;
    product_name: string;
    amount: number;
    status: string;
    buyer_name: string | null;
    seller_name: string | null;
    created_at: string;
  };
  index: number;
}) => {
  const config = statusConfig[transaction.status] || statusConfig.deposited;
  const StatusIcon = config.icon;
  
  const timeAgo = useMemo(() => 
    formatDistanceToNow(new Date(transaction.created_at), {
      addSuffix: true,
      locale: vi,
    }), [transaction.created_at]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
    >
      <div className="p-2 rounded-full bg-primary/10 shrink-0">
        <ShoppingBag className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {transaction.product_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {transaction.buyer_name} ↔ {transaction.seller_name}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-primary">
          {formatCurrency(transaction.amount)}đ
        </p>
        <Badge variant={config.variant} className="text-[10px] h-5">
          <StatusIcon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {timeAgo}
      </span>
    </motion.div>
  );
});
TransactionItem.displayName = "TransactionItem";

const PublicTransactionLog = () => {
  const { data: transactions, isLoading } = usePublicTransactions(8);

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <Card className="border-border relative overflow-hidden">
      <span className="absolute top-2 right-2 text-3xl opacity-[0.08] pointer-events-none">📊</span>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          Giao dịch đang diễn ra
          <Badge variant="secondary" className="ml-auto text-xs">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[320px] overflow-y-auto">
          <div className="divide-y divide-border">
            {transactions.map((transaction, index) => (
              <TransactionItem 
                key={transaction.id} 
                transaction={transaction} 
                index={index} 
              />
            ))}
          </div>
        </div>
        
        {/* Gradient fade at bottom */}
        <div className="h-4 bg-gradient-to-t from-card to-transparent -mt-4 relative z-10" />
      </CardContent>
    </Card>
  );
};

export default memo(PublicTransactionLog);
