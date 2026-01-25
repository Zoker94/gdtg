import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useUpdateTransactionStatus, TransactionStatus } from "@/hooks/useTransactions";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Gavel, CheckCircle, RefreshCcw, AlertTriangle } from "lucide-react";

interface StaffArbitrationPanelProps {
  transactionId: string;
  transactionStatus: TransactionStatus;
  disputeReason?: string | null;
  isAdmin: boolean;
  isModerator: boolean;
}

export const StaffArbitrationPanel = ({
  transactionId,
  transactionStatus,
  disputeReason,
  isAdmin,
  isModerator,
}: StaffArbitrationPanelProps) => {
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const updateStatus = useUpdateTransactionStatus();

  const isStaff = isAdmin || isModerator;
  const canArbitrate = isStaff && ["deposited", "shipping", "disputed"].includes(transactionStatus);

  if (!isStaff) return null;

  const handleResolve = () => {
    updateStatus.mutate(
      { transactionId, status: "completed" },
      {
        onSuccess: () => {
          toast({
            title: "✅ Đã giải ngân",
            description: "Tiền đã được chuyển cho người bán.",
          });
          setResolveDialogOpen(false);
          setResolveNote("");
        },
        onError: () => {
          toast({
            title: "Lỗi",
            description: "Không thể giải ngân. Vui lòng thử lại.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleRefund = () => {
    updateStatus.mutate(
      { transactionId, status: "refunded" },
      {
        onSuccess: () => {
          toast({
            title: "💸 Đã hoàn tiền",
            description: "Tiền đã được hoàn lại cho người mua.",
          });
          setRefundDialogOpen(false);
          setRefundNote("");
        },
        onError: () => {
          toast({
            title: "Lỗi",
            description: "Không thể hoàn tiền. Vui lòng thử lại.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" />
          Phán xử
          <Badge variant="outline" className="text-xs">
            <ShieldCheck className="w-3 h-3 mr-1" />
            {isAdmin ? "Admin" : "Moderator"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dispute Info */}
        {transactionStatus === "disputed" && disputeReason && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold text-sm">Lý do khiếu nại</span>
            </div>
            <p className="text-sm">{disputeReason}</p>
          </div>
        )}

        {/* Status Info */}
        <div className="text-sm text-muted-foreground">
          {canArbitrate ? (
            <p>Bạn có thể phán xử giao dịch này bằng cách giải ngân cho người bán hoặc hoàn tiền cho người mua.</p>
          ) : (
            <p>Giao dịch chưa sẵn sàng để phán xử. Chờ trạng thái phù hợp (đã đặt cọc, đang giao, hoặc có khiếu nại).</p>
          )}
        </div>

        {/* Action Buttons */}
        {canArbitrate && (
          <div className="flex gap-2">
            {/* Resolve - Release to Seller */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Giải ngân
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Xác nhận giải ngân
                  </DialogTitle>
                  <DialogDescription>
                    Tiền sẽ được chuyển cho người bán. Hành động này không thể hoàn tác.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Ghi chú (tùy chọn)..."
                  rows={3}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleResolve} disabled={updateStatus.isPending}>
                    {updateStatus.isPending ? "Đang xử lý..." : "Xác nhận giải ngân"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Refund - Return to Buyer */}
            <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1 gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Hoàn tiền
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <RefreshCcw className="w-5 h-5 text-destructive" />
                    Xác nhận hoàn tiền
                  </DialogTitle>
                  <DialogDescription>
                    Tiền sẽ được hoàn lại cho người mua. Hành động này không thể hoàn tác.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Ghi chú (tùy chọn)..."
                  rows={3}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button variant="destructive" onClick={handleRefund} disabled={updateStatus.isPending}>
                    {updateStatus.isPending ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
