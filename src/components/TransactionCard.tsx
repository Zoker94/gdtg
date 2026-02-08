import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Transaction, TransactionStatus } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useCanRateTransaction } from "@/hooks/useUserRatings";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowRight, Package, Star } from "lucide-react";
import RatingDialog from "@/components/rating/RatingDialog";

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
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  
  const isBuyer = user?.id === transaction.buyer_id;
  const role = isBuyer ? "Người mua" : "Người bán";
  const statusInfo = statusConfig[transaction.status];

  // Check if user can rate this transaction
  const { data: rateInfo } = useCanRateTransaction(
    transaction.status === "completed" ? transaction.id : undefined
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const handleRateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowRatingDialog(true);
  };

  return (
    <>
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
              <div className="flex items-center gap-2">
                {/* Rating button for completed transactions */}
                {transaction.status === "completed" && rateInfo?.canRate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRateClick}
                    className="text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Đánh giá
                  </Button>
                )}
                {/* Show badge if already rated */}
                {transaction.status === "completed" && rateInfo?.existingRating && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                    Đã đánh giá
                  </Badge>
                )}
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Rating Dialog */}
      {rateInfo?.otherUserId && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          transactionId={transaction.id}
          ratedUserId={rateInfo.otherUserId}
        />
      )}
    </>
  );
};
