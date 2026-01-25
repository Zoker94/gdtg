import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { StaffArbitrationPanel } from "@/components/StaffArbitrationPanel";
import { useTransaction, useUpdateTransactionStatus, useConfirmTransaction, TransactionStatus } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUserRole } from "@/hooks/useProfile";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Shield,
  Package,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Copy,
  ImageIcon,
  UserCheck,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";

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
  const { data: profile } = useProfile();
  const { data: roleInfo } = useUserRole();
  const updateStatus = useUpdateTransactionStatus();
  const confirmTransaction = useConfirmTransaction();
  const [disputeReason, setDisputeReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  // Enable realtime for profile balance
  useProfileRealtime();

  const isBuyer = user?.id === transaction?.buyer_id;
  const isSeller = user?.id === transaction?.seller_id;
  const isStaff = roleInfo?.isAdmin || roleInfo?.isModerator;

  // Redirect to dashboard when transaction is completed, cancelled, or refunded
  useEffect(() => {
    if (!transaction) return;
    
    const finalStatuses = ["completed", "cancelled", "refunded"];
    const previousStatus = previousStatusRef.current;
    
    // Only redirect if status just changed to a final status
    if (
      finalStatuses.includes(transaction.status) && 
      previousStatus && 
      !finalStatuses.includes(previousStatus)
    ) {
      const statusMessages: Record<string, { title: string; description: string }> = {
        completed: {
          title: "🎊 Giao dịch hoàn tất!",
          description: "Phòng giao dịch đã đóng. Chuyển về Dashboard...",
        },
        cancelled: {
          title: "❌ Giao dịch đã hủy",
          description: "Phòng giao dịch đã đóng. Chuyển về Dashboard...",
        },
        refunded: {
          title: "💸 Đã hoàn tiền",
          description: "Phòng giao dịch đã đóng. Chuyển về Dashboard...",
        },
      };

      const message = statusMessages[transaction.status];
      if (message) {
        toast({
          title: message.title,
          description: message.description,
        });
      }

      // Redirect after a short delay for user to see the notification
      const timer = setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

      return () => clearTimeout(timer);
    }

    previousStatusRef.current = transaction.status;
  }, [transaction?.status, navigate]);

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

  // Calculate actual amount buyer needs to pay (including fees if applicable)
  const calculateBuyerPayment = () => {
    if (!transaction) return { total: 0, fee: 0 };
    
    const fee = transaction.platform_fee_amount;
    let buyerPays = transaction.amount;
    
    if (transaction.fee_bearer === "buyer") {
      buyerPays = transaction.amount + fee;
    } else if (transaction.fee_bearer === "split") {
      buyerPays = transaction.amount + (fee / 2);
    }
    // If fee_bearer is "seller", buyer only pays amount
    
    return { total: buyerPays, fee };
  };
  
  const buyerPayment = calculateBuyerPayment();

  const handleMockDeposit = async () => {
    if (!transaction || !user?.id || !profile) return;
    
    // Check balance - buyer needs to pay amount + their share of fees
    if (profile.balance < buyerPayment.total) {
      toast({
        title: "Số dư không đủ",
        description: `Bạn cần nạp thêm ${formatCurrency(buyerPayment.total - profile.balance)} để đặt cọc. Tổng cần trả: ${formatCurrency(buyerPayment.total)}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsDepositing(true);
    try {
      // Deduct the full amount buyer needs to pay (including their fee share)
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ balance: profile.balance - buyerPayment.total })
        .eq("user_id", user.id);
      
      if (balanceError) throw balanceError;
      
      // Update transaction status
      handleStatusUpdate("deposited");
      toast({
        title: "Đặt cọc thành công",
        description: `${formatCurrency(buyerPayment.total)} đã được treo giữ trong hệ thống`,
      });
    } catch (error) {
      toast({
        title: "Lỗi đặt cọc",
        description: "Vui lòng thử lại sau",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
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
                    {isBuyer ? "Người mua" : isSeller ? "Người bán" : isStaff ? (roleInfo?.isAdmin ? "Admin" : "Moderator") : "Khách"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Staff Arbitration Panel */}
          {isStaff && transaction && (
            <StaffArbitrationPanel
              transactionId={transaction.id}
              transactionStatus={transaction.status}
              disputeReason={transaction.dispute_reason}
              isAdmin={roleInfo?.isAdmin || false}
              isModerator={roleInfo?.isModerator || false}
            />
          )}

          {/* Progress */}
          <Card className="mb-4 border-border">
            <CardContent className="py-4">
              <TransactionProgress status={transaction.status} />
            </CardContent>
          </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Show details only after deposit */}
              {transaction.status === "pending" && !isSeller ? (
                <Card className="border-border">
                  <CardContent className="py-12 text-center">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Chờ đặt cọc</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Thông tin chi tiết sẽ hiển thị sau khi người mua đặt cọc thành công.
                    </p>
                    {isBuyer && (
                      <>
                        <div className="p-4 bg-muted rounded-lg mb-4">
                          <p className="text-sm text-muted-foreground mb-1">Số tiền cần đặt cọc</p>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(buyerPayment.total)}</p>
                          {transaction.fee_bearer !== "seller" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              (Bao gồm {transaction.fee_bearer === "buyer" ? "phí sàn" : "1/2 phí sàn"}: {formatCurrency(transaction.fee_bearer === "buyer" ? transaction.platform_fee_amount : transaction.platform_fee_amount / 2)})
                            </p>
                          )}
                        </div>
                        <Button onClick={handleMockDeposit} className="glow-primary" disabled={isDepositing}>
                          <DollarSign className="w-4 h-4 mr-2" />
                          {isDepositing ? "Đang xử lý..." : "Đặt cọc ngay"}
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate("cancelled")}
                          variant="ghost"
                          className="w-full mt-2 text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Hủy giao dịch
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
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

                        {/* Seller actions */}
                        {isSeller && transaction.status === "pending" && (
                          <Button
                            onClick={() => handleStatusUpdate("cancelled")}
                            variant="destructive"
                            className="w-full"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Hủy giao dịch
                          </Button>
                        )}

                        {isBuyer && transaction.status === "deposited" && (
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
                </>
              )}

              {/* Chat - always visible for participants */}
              {(isBuyer || isSeller) && transaction.status !== "pending" && (
                <TransactionChat transactionId={transaction.id} />
              )}
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

              {/* Participants */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Người tham gia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Seller */}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        S
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Người bán</p>
                      {transaction.seller_id ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground"
                          onClick={() => navigate(`/user/${transaction.seller_id}`)}
                        >
                          Xem hồ sơ →
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Chưa có</p>
                      )}
                    </div>
                    {isSeller && <Badge variant="outline" className="text-xs">Bạn</Badge>}
                  </div>

                  {/* Buyer */}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        B
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Người mua</p>
                      {transaction.buyer_id ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground"
                          onClick={() => navigate(`/user/${transaction.buyer_id}`)}
                        >
                          Xem hồ sơ →
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Chưa có</p>
                      )}
                    </div>
                    {isBuyer && <Badge variant="outline" className="text-xs">Bạn</Badge>}
                  </div>
                </CardContent>
              </Card>

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
