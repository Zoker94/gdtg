import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowDownToLine, 
  CheckCircle, 
  XCircle, 
  User,
  Building2,
  CreditCard,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: string;
  created_at: string;
  admin_note?: string | null;
}

interface PendingWithdrawalsWidgetProps {
  withdrawals: Withdrawal[];
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onHold?: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

const PendingWithdrawalsWidget = ({
  withdrawals,
  onConfirm,
  onReject,
  onHold,
  formatCurrency,
}: PendingWithdrawalsWidgetProps) => {
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const onHoldWithdrawals = withdrawals.filter((w) => w.status === "on_hold");
  const allPending = [...pendingWithdrawals, ...onHoldWithdrawals];

  if (allPending.length === 0) return null;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-600">
          <ArrowDownToLine className="w-4 h-4" />
          Rút tiền chờ duyệt
          <Badge variant="secondary" className="ml-auto text-xs">
            {allPending.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className={allPending.length > 2 ? "h-[250px]" : ""}>
          <div className="space-y-2">
            {allPending.map((w) => (
              <div
                key={w.id}
                className={`p-3 rounded-lg bg-background border shadow-sm ${
                  w.status === "on_hold" ? "border-amber-500/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-blue-600">
                        {formatCurrency(w.amount)}
                      </span>
                      {w.status === "on_hold" && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          Đang kiểm tra
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{w.bank_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CreditCard className="w-3 h-3 shrink-0" />
                      <span className="font-mono">{w.bank_account_number}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{w.bank_account_name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(w.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </p>
                    {w.admin_note && (
                      <p className="text-xs text-amber-600 mt-1">
                        Ghi chú: {w.admin_note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onConfirm(w.id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Duyệt
                    </Button>
                    {w.status === "pending" && onHold && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => onHold(w.id)}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Giữ lại
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onReject(w.id)}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Từ chối
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PendingWithdrawalsWidget;
