import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RoomStatus = "available" | "occupied" | "pending";

interface TableData {
  id: string;
  tableNumber: number;
  status: RoomStatus;
  roomId?: string;
  productName?: string;
  amount?: number;
}

const TransactionRoomMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch active transactions to map to tables
  const { data: transactions = [] } = useQuery({
    queryKey: ["public-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, room_id, product_name, amount, status, buyer_id, seller_id")
        .in("status", ["pending", "deposited", "shipping"])
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data;
    },
  });

  // Generate 12 tables, mapping real transactions to them
  const tables: TableData[] = Array.from({ length: 12 }, (_, i) => {
    const transaction = transactions[i];
    
    if (transaction) {
      // Check if both buyer and seller are present
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
        return "hsl(var(--chart-2))"; // Green
      case "occupied":
        return "hsl(var(--destructive))"; // Red
      case "pending":
        return "hsl(var(--chart-4))"; // Yellow/Orange
      default:
        return "hsl(var(--muted))";
    }
  };

  const getStatusBgClass = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "bg-chart-2/20 hover:bg-chart-2/30 border-chart-2/50";
      case "occupied":
        return "bg-destructive/20 border-destructive/50 cursor-not-allowed";
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
      if (!user) {
        navigate("/auth");
      } else {
        navigate("/create-transaction");
      }
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
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold mb-2">Sơ đồ phòng giao dịch</h2>
          <p className="text-muted-foreground">
            Chọn bàn trống để tạo giao dịch hoặc tham gia phòng đang chờ
          </p>
        </motion.div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-chart-2/60 border border-chart-2"></div>
            <span className="text-sm text-muted-foreground">Trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-chart-4/60 border border-chart-4"></div>
            <span className="text-sm text-muted-foreground">Đang chờ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/60 border border-destructive"></div>
            <span className="text-sm text-muted-foreground">Có người</span>
          </div>
        </div>

        {/* Room layout - 3 rows x 4 columns of tables */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-muted/30 rounded-2xl p-6 md:p-8 border border-border"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {tables.map((table, index) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${getStatusBgClass(table.status)}
                  ${table.status !== "occupied" ? "cursor-pointer hover:scale-105" : ""}
                `}
                onClick={() => handleTableClick(table)}
              >
                {/* Table visualization */}
                <div className="flex flex-col items-center">
                  {/* Top chairs */}
                  <div className="flex gap-2 mb-2">
                    <Chair filled={table.status === "occupied" || table.status === "pending"} color={getStatusColor(table.status)} />
                    <Chair filled={table.status === "occupied"} color={getStatusColor(table.status)} />
                  </div>
                  
                  {/* Table */}
                  <div 
                    className="w-full h-12 rounded-lg flex items-center justify-center text-sm font-medium"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${getStatusColor(table.status)} 30%, transparent)`,
                      border: `2px solid ${getStatusColor(table.status)}`
                    }}
                  >
                    <span className="text-foreground">Bàn {table.tableNumber}</span>
                  </div>

                  {/* Bottom chairs */}
                  <div className="flex gap-2 mt-2">
                    <Chair filled={table.status === "occupied"} color={getStatusColor(table.status)} rotate />
                    <Chair filled={table.status === "occupied" || table.status === "pending"} color={getStatusColor(table.status)} rotate />
                  </div>
                </div>

                {/* Room info tooltip */}
                {table.productName && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-foreground font-medium truncate">
                      {table.productName}
                    </p>
                    {table.amount && (
                      <p className="text-xs text-primary font-semibold">
                        {formatCurrency(table.amount)}
                      </p>
                    )}
                  </div>
                )}

                {table.status === "available" && (
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    Nhấn để tạo
                  </p>
                )}
                {table.status === "pending" && (
                  <p className="text-xs text-center mt-2 text-chart-4">
                    Nhấn để tham gia
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Chair component
const Chair = ({ filled, color, rotate = false }: { filled: boolean; color: string; rotate?: boolean }) => (
  <svg 
    width="24" 
    height="20" 
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

export default TransactionRoomMap;
