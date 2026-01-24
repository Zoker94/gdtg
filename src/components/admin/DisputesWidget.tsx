import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

interface Transaction {
  id: string;
  transaction_code: string;
  product_name: string;
  amount: number;
  status: string;
  dispute_reason?: string | null;
}

interface DisputesWidgetProps {
  transactions: Transaction[];
  onResolve: (id: string) => void;
  onRefund: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

const DisputesWidget = ({
  transactions,
  onResolve,
  onRefund,
  formatCurrency,
}: DisputesWidgetProps) => {
  const disputed = transactions.filter((t) => t.status === "disputed");

  if (disputed.length === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          Khiếu nại cần xử lý
          <Badge variant="destructive" className="ml-auto text-xs">
            {disputed.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className={disputed.length > 2 ? "h-[180px]" : ""}>
          <div className="space-y-2">
            {disputed.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg bg-background border shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.product_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{t.transaction_code}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {t.dispute_reason || "Không có lý do"}
                    </p>
                    <p className="text-sm font-semibold mt-1">{formatCurrency(t.amount)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onResolve(t.id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Hoàn tất
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => onRefund(t.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Hoàn tiền
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

export default DisputesWidget;
