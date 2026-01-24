import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, CheckCircle, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  status: string;
  is_submitted: boolean;
  created_at: string;
}

interface PendingDepositsWidgetProps {
  deposits: Deposit[];
  onConfirm: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

const PendingDepositsWidget = ({
  deposits,
  onConfirm,
  formatCurrency,
}: PendingDepositsWidgetProps) => {
  // Only show deposits that are pending AND user has confirmed they paid
  const pendingDeposits = deposits.filter((d) => d.status === "pending" && d.is_submitted === true);

  if (pendingDeposits.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
          <Wallet className="w-4 h-4" />
          Nạp tiền chờ duyệt
          <Badge variant="secondary" className="ml-auto text-xs">
            {pendingDeposits.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className={pendingDeposits.length > 3 ? "h-[180px]" : ""}>
          <div className="space-y-2">
            {pendingDeposits.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-lg bg-background border shadow-sm flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-amber-600">
                    {formatCurrency(d.amount)}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CreditCard className="w-3 h-3" />
                    <span>{d.payment_method === "bank" ? "Chuyển khoản" : d.payment_method}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    NAP {d.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(d.created_at), "dd/MM HH:mm", { locale: vi })}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => onConfirm(d.id)}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Xác nhận
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PendingDepositsWidget;
