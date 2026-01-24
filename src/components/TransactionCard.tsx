import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction, TransactionStatus } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowRight, Package } from "lucide-react";

interface TransactionCardProps {
  transaction: Transaction;
}

const statusConfig: Record<TransactionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Chờ thanh toán", variant: "secondary" },
  deposited: { label: "Đã đặt cọc", variant: "default" },
  shipping: { label: "Đang giao", variant: "default" },
  completed: { label: "Hoàn tất", variant: "outline" },
  disputed: { label: "Khiếu nại", variant: "destructive" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
  refunded: { label: "Hoàn tiền", variant: "secondary" },
};

export const TransactionCard = ({ transaction }: TransactionCardProps) => {
  const { user } = useAuth();
  const isBuyer = user?.id === transaction.buyer_id;
  const role = isBuyer ? "Người mua" : "Người bán";
  const statusInfo = statusConfig[transaction.status];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <Link to={`/transaction/${transaction.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold line-clamp-1">{transaction.product_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {transaction.transaction_code}
                </p>
              </div>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vai trò: {role}</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(transaction.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
