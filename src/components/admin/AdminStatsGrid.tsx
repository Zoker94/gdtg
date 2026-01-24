import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  Wallet,
  ArrowDownToLine,
  DollarSign,
} from "lucide-react";

interface AdminStatsGridProps {
  totalTransactions: number;
  disputedCount: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalVolume: number;
  totalFees: number;
  formatCurrency: (amount: number) => string;
}

const AdminStatsGrid = ({
  totalTransactions,
  disputedCount,
  pendingDeposits,
  pendingWithdrawals,
  totalVolume,
  totalFees,
  formatCurrency,
}: AdminStatsGridProps) => {
  const stats = [
    {
      label: "Giao dịch",
      value: totalTransactions,
      icon: Package,
      iconClass: "text-primary",
    },
    {
      label: "Khiếu nại",
      value: disputedCount,
      icon: AlertTriangle,
      iconClass: "text-destructive",
      valueClass: "text-destructive",
    },
    {
      label: "Nạp chờ",
      value: pendingDeposits,
      icon: Wallet,
      iconClass: "text-amber-500",
      valueClass: "text-amber-500",
    },
    {
      label: "Rút chờ",
      value: pendingWithdrawals,
      icon: ArrowDownToLine,
      iconClass: "text-blue-500",
      valueClass: "text-blue-500",
    },
    {
      label: "Khối lượng",
      value: formatCurrency(totalVolume),
      icon: DollarSign,
      iconClass: "text-green-500",
      isFormatted: true,
    },
    {
      label: "Phí thu",
      value: formatCurrency(totalFees),
      icon: DollarSign,
      iconClass: "text-primary",
      valueClass: "text-primary",
      isFormatted: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 shrink-0 ${stat.iconClass}`} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                <p className={`text-sm font-bold truncate ${stat.valueClass || ""}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStatsGrid;
