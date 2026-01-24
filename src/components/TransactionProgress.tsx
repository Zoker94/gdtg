import { Check, Clock, Truck, AlertTriangle, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionStatus } from "@/hooks/useTransactions";

interface TransactionProgressProps {
  status: TransactionStatus;
  className?: string;
}

const steps = [
  { status: "pending", label: "Chờ thanh toán", icon: Clock },
  { status: "deposited", label: "Đã đặt cọc", icon: DollarSign },
  { status: "shipping", label: "Đang giao hàng", icon: Truck },
  { status: "completed", label: "Hoàn tất", icon: Check },
];

const getStepIndex = (status: TransactionStatus): number => {
  if (status === "disputed" || status === "cancelled" || status === "refunded") {
    return -1;
  }
  return steps.findIndex((s) => s.status === status);
};

export const TransactionProgress = ({ status, className }: TransactionProgressProps) => {
  const currentIndex = getStepIndex(status);
  const isDisputed = status === "disputed";
  const isCancelled = status === "cancelled";
  const isRefunded = status === "refunded";

  if (isDisputed || isCancelled || isRefunded) {
    return (
      <div className={cn("flex items-center justify-center gap-3 p-4 rounded-lg", className, {
        "bg-destructive/10 text-destructive": isDisputed,
        "bg-muted text-muted-foreground": isCancelled,
        "bg-warning/10 text-warning": isRefunded,
      })}>
        <AlertTriangle className="w-6 h-6" />
        <span className="font-medium">
          {isDisputed && "Đang khiếu nại"}
          {isCancelled && "Đã hủy"}
          {isRefunded && "Đã hoàn tiền"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-8">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.status} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  {
                    "bg-primary text-primary-foreground": isCompleted,
                    "bg-muted text-muted-foreground": !isCompleted,
                    "ring-4 ring-primary/20": isCurrent,
                  }
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn("mt-2 text-xs font-medium text-center max-w-[80px]", {
                  "text-primary": isCompleted,
                  "text-muted-foreground": !isCompleted,
                })}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
