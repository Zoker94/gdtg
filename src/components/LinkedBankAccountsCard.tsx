import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Plus, Trash2, AlertTriangle, Building2 } from "lucide-react";
import { useLinkedBanks, useAddLinkedBank, useDeleteLinkedBank } from "@/hooks/useLinkedBanks";

const BANKS = [
  "Vietcombank",
  "Techcombank",
  "BIDV",
  "VietinBank",
  "ACB",
  "MB Bank",
  "VPBank",
  "Sacombank",
  "TPBank",
  "HDBank",
  "Agribank",
  "OCB",
  "SHB",
  "MSB",
  "VIB",
  "SeABank",
  "Nam A Bank",
  "Bac A Bank",
  "LienVietPostBank",
  "Eximbank",
  "Khác",
];

interface LinkedBankAccountsCardProps {
  kycFullName?: string | null;
}

const LinkedBankAccountsCard = ({ kycFullName }: LinkedBankAccountsCardProps) => {
  const { data: linkedBanks, isLoading } = useLinkedBanks();
  const addBank = useAddLinkedBank();
  const deleteBank = useDeleteLinkedBank();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canAddMore = (linkedBanks?.length || 0) < 2;

  const handleAdd = () => {
    if (!bankName || !accountNumber || !accountName) return;
    
    addBank.mutate(
      {
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_account_name: accountName.toUpperCase(),
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setBankName("");
          setAccountNumber("");
          setAccountName("");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteBank.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  // Normalize names for comparison (remove diacritics, spaces, uppercase)
  const normalizeName = (name: string) => {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/\s+/g, "")
      .toUpperCase();
  };

  const isNameMatching = kycFullName && accountName
    ? normalizeName(kycFullName) === normalizeName(accountName)
    : false;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Tài khoản ngân hàng liên kết
            <Badge variant="secondary" className="ml-auto text-xs">
              {linkedBanks?.length || 0}/2
            </Badge>
          </CardTitle>
          <CardDescription>
            Chỉ được rút tiền về tài khoản đã đăng ký. Tên phải khớp với KYC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : linkedBanks?.length === 0 ? (
            <div className="text-center py-4">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Chưa có tài khoản ngân hàng nào được liên kết
              </p>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm tài khoản
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm tài khoản ngân hàng</DialogTitle>
                    <DialogDescription>
                      Tên chủ tài khoản phải trùng khớp với tên trên KYC: <strong>{kycFullName || "Chưa có"}</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ngân hàng</Label>
                      <Select value={bankName} onValueChange={setBankName}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ngân hàng" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANKS.map((bank) => (
                            <SelectItem key={bank} value={bank}>
                              {bank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Số tài khoản</Label>
                      <Input
                        placeholder="Nhập số tài khoản"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tên chủ tài khoản</Label>
                      <Input
                        placeholder="VD: NGUYEN VAN A"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                      {accountName && kycFullName && !isNameMatching && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Tên không khớp với KYC. Bạn sẽ không thể rút tiền về tài khoản này.
                        </p>
                      )}
                      {accountName && kycFullName && isNameMatching && (
                        <p className="text-xs text-green-600">
                          ✓ Tên khớp với KYC
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Hủy
                    </Button>
                    <Button
                      onClick={handleAdd}
                      disabled={addBank.isPending || !bankName || !accountNumber || !accountName}
                    >
                      {addBank.isPending ? "Đang thêm..." : "Thêm tài khoản"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedBanks?.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{bank.bank_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{bank.bank_account_number}</p>
                      <p className="text-xs text-muted-foreground">{bank.bank_account_name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(bank.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {canAddMore && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-1" />
                      Thêm tài khoản ({2 - (linkedBanks?.length || 0)} còn lại)
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Thêm tài khoản ngân hàng</DialogTitle>
                      <DialogDescription>
                        Tên chủ tài khoản phải trùng khớp với tên trên KYC: <strong>{kycFullName || "Chưa có"}</strong>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Ngân hàng</Label>
                        <Select value={bankName} onValueChange={setBankName}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn ngân hàng" />
                          </SelectTrigger>
                          <SelectContent>
                            {BANKS.map((bank) => (
                              <SelectItem key={bank} value={bank}>
                                {bank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Số tài khoản</Label>
                        <Input
                          placeholder="Nhập số tài khoản"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tên chủ tài khoản</Label>
                        <Input
                          placeholder="VD: NGUYEN VAN A"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                          className="uppercase"
                        />
                        {accountName && kycFullName && !isNameMatching && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Tên không khớp với KYC
                          </p>
                        )}
                        {accountName && kycFullName && isNameMatching && (
                          <p className="text-xs text-green-600">
                            ✓ Tên khớp với KYC
                          </p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Hủy
                      </Button>
                      <Button
                        onClick={handleAdd}
                        disabled={addBank.isPending || !bankName || !accountNumber || !accountName}
                      >
                        {addBank.isPending ? "Đang thêm..." : "Thêm tài khoản"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản ngân hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ không thể rút tiền về tài khoản này sau khi xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LinkedBankAccountsCard;
