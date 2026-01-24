import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

type RoomStatus = "available" | "occupied" | "pending";

interface TableData {
  id: string;
  tableNumber: number;
  status: RoomStatus;
  roomId?: string;
  productName?: string;
  amount?: number;
}

const DashboardRoomMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch active transactions to map to tables
  const { data: transactions = [] } = useQuery({
    queryKey: ["public-transactions-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, room_id, product_name, amount, status, buyer_id, seller_id")
        .in("status", ["pending", "deposited", "shipping"])
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Auto refresh every 5 seconds
  });

  // Generate 4 tables, mapping real transactions to them
  const tables: TableData[] = Array.from({ length: 4 }, (_, i) => {
    const transaction = transactions[i];
    
    if (transaction) {
      const hasBoth = transaction.buyer_id && transaction.seller_id;
      
      return {
        id: transaction.id,
        tableNumber: i + 1,
        status: hasBoth ? "occupied" : "pending",
        roomId: transaction.room_id || undefined,
        productName: transaction.product_name,
        amount: transaction.amount,
      };
    }
    
    return {
      id: `empty-${i}`,
      tableNumber: i + 1,
      status: "available",
    };
  });

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "hsl(var(--muted-foreground))"; // White/neutral
      case "occupied":
        return "hsl(var(--destructive))"; // Red
      case "pending":
        return "hsl(var(--chart-4))"; // Yellow
      default:
        return "hsl(var(--muted))";
    }
  };

  const getStatusBgClass = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "bg-background hover:bg-muted/50 border-border";
      case "occupied":
        return "bg-destructive/10 border-destructive/50 cursor-not-allowed";
      case "pending":
        return "bg-chart-4/20 hover:bg-chart-4/30 border-chart-4/50";
      default:
        return "bg-muted";
    }
  };

  const handleTableClick = (table: TableData) => {
    if (table.status === "occupied") {
      toast.error("Bàn này đã có đủ người giao dịch");
      return;
    }

    if (table.status === "available") {
      navigate("/create-transaction");
      return;
    }

    // Pending - has room but needs another participant
    if (table.roomId) {
      navigate(`/join/${table.roomId}`);
    } else {
      navigate("/join");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Sơ đồ phòng giao dịch
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Legend */}
        <div className="flex justify-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-background border border-border"></div>
            <span className="text-muted-foreground">Trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-chart-4/60 border border-chart-4"></div>
            <span className="text-muted-foreground">Đang chờ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-destructive/60 border border-destructive"></div>
            <span className="text-muted-foreground">Có người</span>
          </div>
        </div>

        {/* 2x2 Grid of tables */}
        <div className="grid grid-cols-2 gap-3">
          {tables.map((table, index) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`
                relative p-3 rounded-lg border-2 transition-all duration-200
                ${getStatusBgClass(table.status)}
                ${table.status !== "occupied" ? "cursor-pointer hover:scale-[1.02]" : ""}
              `}
              onClick={() => handleTableClick(table)}
            >
              {/* Table visualization */}
              <div className="flex flex-col items-center">
                {/* Top chairs */}
                <div className="flex gap-1 mb-1">
                  <Chair 
                    filled={table.status === "occupied" || table.status === "pending"} 
                    color={getStatusColor(table.status)} 
                    size="sm"
                  />
                  <Chair 
                    filled={table.status === "occupied"} 
                    color={getStatusColor(table.status)} 
                    size="sm"
                  />
                </div>
                
                {/* Table */}
                <div 
                  className="w-full h-8 rounded flex items-center justify-center text-xs font-medium"
                  style={{ 
                    backgroundColor: `color-mix(in srgb, ${getStatusColor(table.status)} 20%, transparent)`,
                    border: `1.5px solid ${getStatusColor(table.status)}`
                  }}
                >
                  <span className="text-foreground">Bàn {table.tableNumber}</span>
                </div>

                {/* Bottom chairs */}
                <div className="flex gap-1 mt-1">
                  <Chair 
                    filled={table.status === "occupied"} 
                    color={getStatusColor(table.status)} 
                    rotate 
                    size="sm"
                  />
                  <Chair 
                    filled={table.status === "occupied" || table.status === "pending"} 
                    color={getStatusColor(table.status)} 
                    rotate 
                    size="sm"
                  />
                </div>
              </div>

              {/* Room info */}
              {table.productName && (
                <div className="mt-2 text-center">
                  <p className="text-[10px] text-foreground font-medium truncate">
                    {table.productName}
                  </p>
                  {table.amount && (
                    <p className="text-[10px] text-primary font-semibold">
                      {formatCurrency(table.amount)}
                    </p>
                  )}
                </div>
              )}

              {table.status === "available" && (
                <p className="text-[10px] text-center mt-1 text-muted-foreground">
                  Nhấn để tạo
                </p>
              )}
              {table.status === "pending" && (
                <p className="text-[10px] text-center mt-1 text-chart-4">
                  Nhấn để tham gia
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Chair component - smaller version
const Chair = ({ 
  filled, 
  color, 
  rotate = false,
  size = "md" 
}: { 
  filled: boolean; 
  color: string; 
  rotate?: boolean;
  size?: "sm" | "md";
}) => {
  const dimensions = size === "sm" ? { width: 16, height: 14 } : { width: 24, height: 20 };
  
  return (
    <svg 
      width={dimensions.width} 
      height={dimensions.height} 
      viewBox="0 0 24 20" 
      className={`${rotate ? "rotate-180" : ""}`}
    >
      {/* Chair back */}
      <path
        d="M4 2C4 1 5 0 6 0H18C19 0 20 1 20 2V8C20 9 19 10 18 10H6C5 10 4 9 4 8V2Z"
        fill={filled ? color : "transparent"}
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Chair seat */}
      <rect
        x="3"
        y="10"
        width="18"
        height="6"
        rx="1"
        fill={filled ? color : "transparent"}
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Chair legs */}
      <line x1="5" y1="16" x2="5" y2="20" stroke={color} strokeWidth="1.5" />
      <line x1="19" y1="16" x2="19" y2="20" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

export default DashboardRoomMap;
