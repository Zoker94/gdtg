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
import { RoomInfo } from "@/components/RoomInfo";
import { useTransaction, useUpdateTransactionStatus, useConfirmTransaction, TransactionStatus } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  Package,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  DollarSign,
  Copy,
  ImageIcon,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  game_account: "Tài khoản game",
  game_item: "Vật phẩm game",
  game_service: "Dịch vụ game",
  digital_product: "Sản phẩm số",
  other: "Khác",
};

const TransactionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transaction, isLoading } = useTransaction(id);
  const updateStatus = useUpdateTransactionStatus();
  const confirmTransaction = useConfirmTransaction();
  const [disputeReason, setDisputeReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleConfirm = (role: "buyer" | "seller") => {
    if (!id) return;
    confirmTransaction.mutate({ transactionId: id, role });
  };

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      toast({ title: "Vui lòng nhập lý do khiếu nại", variant: "destructive" });
      return;
    }
    handleStatusUpdate("disputed", { dispute_reason: disputeReason });
    setDialogOpen(false);
  };

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
        <header className="border-b border-border bg-card sticky top-0 z-50">
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
        <Card className="max-w-md w-full border-border">
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

  const categoryLabel = CATEGORY_LABELS[transaction.category || "other"] || "Khác";
  const images = transaction.images || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">EscrowVN</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

          {/* Transaction Header */}
          <Card className="mb-4 border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl">{transaction.product_name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{transaction.transaction_code}</span>
                    <button onClick={copyTransactionCode} className="hover:text-primary">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isBuyer ? "default" : isSeller ? "secondary" : "outline"}>
                    {isBuyer ? "Người mua" : isSeller ? "Người bán" : "Khách"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Progress */}
          <Card className="mb-4 border-border">
            <CardContent className="py-4">
              <TransactionProgress status={transaction.status} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Images */}
              {images.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Ảnh sản phẩm
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setImagePreview(img)}
                          className="aspect-square rounded border overflow-hidden hover:ring-2 ring-primary transition-all"
                        >
                          <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Details */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Chi tiết</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transaction.product_description && (
                    <div className="p-3 bg-muted rounded text-sm">
                      {transaction.product_description}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted rounded">
                      <p className="text-muted-foreground text-xs mb-1">Số tiền</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-muted-foreground text-xs mb-1">Phí sàn</p>
                      <p className="text-lg font-semibold text-destructive">
                        {formatCurrency(transaction.platform_fee_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted rounded">
                      <p className="text-muted-foreground text-xs mb-1">Người bán nhận</p>
                      <p className="text-lg font-semibold text-primary">
                        {formatCurrency(transaction.seller_receives)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-muted-foreground text-xs mb-1">Người chịu phí</p>
                      <p className="font-medium">{feeBearer}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Khiếu nại: {transaction.dispute_time_hours}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
                    </div>
                  </div>

                  {/* Confirmation Status */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Trạng thái xác nhận</p>
                    <div className="flex gap-3">
                      <Badge variant={transaction.buyer_confirmed ? "default" : "outline"} className="gap-1">
                        <UserCheck className="w-3 h-3" />
                        Người mua {transaction.buyer_confirmed ? "✓" : ""}
                      </Badge>
                      <Badge variant={transaction.seller_confirmed ? "default" : "outline"} className="gap-1">
                        <UserCheck className="w-3 h-3" />
                        Người bán {transaction.seller_confirmed ? "✓" : ""}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-border space-y-2">
                    {/* Confirm Buttons */}
                    {isBuyer && !transaction.buyer_confirmed && transaction.status !== "pending" && (
                      <Button
                        onClick={() => handleConfirm("buyer")}
                        variant="outline"
                        className="w-full"
                        disabled={confirmTransaction.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Xác nhận mua
                      </Button>
                    )}

                    {isSeller && !transaction.seller_confirmed && (
                      <Button
                        onClick={() => handleConfirm("seller")}
                        variant="outline"
                        className="w-full"
                        disabled={confirmTransaction.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Xác nhận bán
                      </Button>
                    )}

                    {/* Buyer actions */}
                    {isBuyer && transaction.status === "pending" && (
                      <Button onClick={handleMockDeposit} className="w-full glow-primary">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Thanh toán (Giả lập)
                      </Button>
                    )}

                    {isBuyer && transaction.status === "shipping" && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate("completed")}
                          className="w-full glow-primary"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Đã nhận hàng - Giải ngân
                        </Button>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Khiếu nại
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Khiếu nại giao dịch</DialogTitle>
                              <DialogDescription>
                                Mô tả chi tiết vấn đề. Admin sẽ xem xét và giải quyết.
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
                        className="w-full glow-primary"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Đã gửi hàng
                      </Button>
                    )}

                    {/* Dispute info */}
                    {transaction.status === "disputed" && transaction.dispute_reason && (
                      <div className="p-3 bg-destructive/10 rounded">
                        <div className="flex items-center gap-2 text-destructive mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-semibold text-sm">Lý do khiếu nại</span>
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

            {/* Right Column - Room Info */}
            <div className="space-y-4">
              {transaction.room_id && transaction.room_password && transaction.invite_link && (
                <RoomInfo
                  roomId={transaction.room_id}
                  roomPassword={transaction.room_password}
                  inviteLink={transaction.invite_link}
                />
              )}

              {/* Waiting for other party */}
              {((isSeller && !transaction.buyer_id) || (isBuyer && !transaction.seller_id)) && (
                <Card className="border-border">
                  <CardContent className="py-6 text-center">
                    <div className="animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">Đang chờ {isSeller ? "người mua" : "người bán"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gửi thông tin phòng để họ vào
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export default TransactionDetail;
