import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TransactionProgress } from "@/components/TransactionProgress";
import { TransactionChat } from "@/components/TransactionChat";
import { useTransaction, useUpdateTransactionStatus, TransactionStatus } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  Package,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Truck,
  DollarSign,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";

const TransactionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transaction, isLoading } = useTransaction(id);
  const updateStatus = useUpdateTransactionStatus();
  const [disputeReason, setDisputeReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const isBuyer = user?.id === transaction?.buyer_id;
  const isSeller = user?.id === transaction?.seller_id;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const copyTransactionCode = () => {
    if (transaction?.transaction_code) {
      navigator.clipboard.writeText(transaction.transaction_code);
      toast({ title: "Đã sao chép mã giao dịch" });
    }
  };

  const handleStatusUpdate = (status: TransactionStatus, additionalData?: Record<string, string>) => {
    if (!id) return;
    updateStatus.mutate({ transactionId: id, status, additionalData });
  };

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      toast({ title: "Vui lòng nhập lý do khiếu nại", variant: "destructive" });
      return;
    }
    handleStatusUpdate("disputed", { dispute_reason: disputeReason });
    setDialogOpen(false);
  };

  // Mock deposit function (giả lập nạp tiền)
  const handleMockDeposit = () => {
    handleStatusUpdate("deposited");
    toast({
      title: "Giả lập thanh toán thành công",
      description: "Tiền đã được đặt cọc vào hệ thống",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-40" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-[600px] w-full" />
        </main>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Không tìm thấy giao dịch</p>
            <Button onClick={() => navigate("/dashboard")}>Về Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const feeBearer = {
    buyer: "Người mua chịu",
    seller: "Người bán chịu",
    split: "Chia đôi",
  }[transaction.fee_bearer];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">EscrowVN</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>

          {/* Transaction Header */}
          <Card className="glass mb-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-2xl">{transaction.product_name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{transaction.transaction_code}</span>
                    <button onClick={copyTransactionCode} className="hover:text-primary">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Badge variant={isBuyer ? "default" : "secondary"} className="text-sm">
                  {isBuyer ? "Người mua" : "Người bán"}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Progress */}
          <Card className="glass mb-6">
            <CardContent className="py-6">
              <TransactionProgress status={transaction.status} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Details */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Chi tiết giao dịch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.product_description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Mô tả</p>
                    <p className="text-sm">{transaction.product_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Số tiền</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phí sàn</p>
                    <p className="text-lg font-semibold text-destructive">
                      {formatCurrency(transaction.platform_fee_amount)} ({transaction.platform_fee_percent}%)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Người bán nhận</p>
                    <p className="text-lg font-semibold text-success">
                      {formatCurrency(transaction.seller_receives)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Người chịu phí</p>
                    <p className="font-medium">{feeBearer}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Thời gian khiếu nại: {transaction.dispute_time_hours} giờ</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Tạo lúc: {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-border space-y-3">
                  {/* Buyer actions */}
                  {isBuyer && transaction.status === "pending" && (
                    <Button onClick={handleMockDeposit} className="w-full" size="lg">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Thanh toán (Giả lập)
                    </Button>
                  )}

                  {isBuyer && transaction.status === "shipping" && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate("completed")}
                        className="w-full"
                        size="lg"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Xác nhận đã nhận hàng
                      </Button>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="w-full" size="lg">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Khiếu nại
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Khiếu nại giao dịch</DialogTitle>
                            <DialogDescription>
                              Vui lòng mô tả chi tiết vấn đề bạn gặp phải. Admin sẽ xem xét và giải quyết.
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            placeholder="Nhập lý do khiếu nại..."
                            rows={4}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                              Hủy
                            </Button>
                            <Button variant="destructive" onClick={handleDispute}>
                              Gửi khiếu nại
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}

                  {/* Seller actions */}
                  {isSeller && transaction.status === "deposited" && (
                    <Button
                      onClick={() => handleStatusUpdate("shipping")}
                      className="w-full"
                      size="lg"
                    >
                      <Truck className="w-5 h-5 mr-2" />
                      Đã gửi hàng
                    </Button>
                  )}

                  {/* Dispute info */}
                  {transaction.status === "disputed" && transaction.dispute_reason && (
                    <div className="p-4 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">Lý do khiếu nại</span>
                      </div>
                      <p className="text-sm">{transaction.dispute_reason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <TransactionChat transactionId={transaction.id} />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TransactionDetail;
