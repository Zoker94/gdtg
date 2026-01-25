import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAllKycSubmissions, useApproveKyc, useRejectKyc, KycSubmission } from "@/hooks/useKYC";
import { CheckCircle, XCircle, Eye, Loader2, RefreshCw, Search, IdCard } from "lucide-react";

const KYCManagementWidget = () => {
  const { data: submissions, isLoading, refetch } = useAllKycSubmissions();
  const approveKyc = useApproveKyc();
  const rejectKyc = useRejectKyc();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewSubmission, setViewSubmission] = useState<KycSubmission | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredSubmissions = submissions?.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id_number.includes(searchTerm)
  );

  const pendingCount = submissions?.filter((s) => s.status === "pending").length || 0;

  const handleApprove = async (id: string) => {
    await approveKyc.mutateAsync(id);
    setViewSubmission(null);
  };

  const handleRejectClick = (id: string) => {
    setSelectedId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedId || !rejectReason.trim()) return;
    await rejectKyc.mutateAsync({ submissionId: selectedId, reason: rejectReason });
    setRejectDialogOpen(false);
    setViewSubmission(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Chờ duyệt</Badge>;
      case "approved":
        return <Badge variant="default">Đã duyệt</Badge>;
      case "rejected":
        return <Badge variant="destructive">Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="glass border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5" />
            Quản lý KYC
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} chờ duyệt
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc số CCCD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredSubmissions?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Không có yêu cầu KYC nào</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Số CCCD</TableHead>
                    <TableHead>Ngày gửi</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions?.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.full_name}</TableCell>
                      <TableCell>{submission.id_number}</TableCell>
                      <TableCell>
                        {new Date(submission.created_at).toLocaleDateString("vi-VN")}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewSubmission(submission)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {submission.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(submission.id)}
                                disabled={approveKyc.isPending}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectClick(submission.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={() => setViewSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết KYC</DialogTitle>
            <DialogDescription>Xem xét thông tin xác minh danh tính</DialogDescription>
          </DialogHeader>

          {viewSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Mặt trước CCCD</p>
                  <img
                    src={viewSubmission.front_image_url}
                    alt="Mặt trước"
                    className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                    onClick={() => window.open(viewSubmission.front_image_url, "_blank")}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Mặt sau CCCD</p>
                  <img
                    src={viewSubmission.back_image_url}
                    alt="Mặt sau"
                    className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                    onClick={() => window.open(viewSubmission.back_image_url, "_blank")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Họ và tên</p>
                  <p className="font-medium">{viewSubmission.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số CCCD</p>
                  <p className="font-medium">{viewSubmission.id_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ngày sinh</p>
                  <p className="font-medium">
                    {viewSubmission.date_of_birth
                      ? new Date(viewSubmission.date_of_birth).toLocaleDateString("vi-VN")
                      : "Không có"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trạng thái</p>
                  {getStatusBadge(viewSubmission.status)}
                </div>
              </div>

              {viewSubmission.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Lý do từ chối:</p>
                  <p className="text-sm">{viewSubmission.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          {viewSubmission?.status === "pending" && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleRejectClick(viewSubmission.id)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
              <Button onClick={() => handleApprove(viewSubmission.id)} disabled={approveKyc.isPending}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Duyệt KYC
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối KYC</DialogTitle>
            <DialogDescription>Vui lòng nhập lý do từ chối xác minh</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || rejectKyc.isPending}
            >
              {rejectKyc.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KYCManagementWidget;
