import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Shield, UserCog } from "lucide-react";

type RoomStatus = "available" | "occupied" | "pending";

interface TableData {
  id: string;
  tableNumber: number;
  status: RoomStatus;
  roomId?: string;
  productName?: string;
  amount?: number;
  hasBuyer?: boolean;
  hasSeller?: boolean;
}

const TransactionRoomMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roles } = useUserRole();
  const queryClient = useQueryClient();

  const isStaff = roles?.isAdmin || roles?.isModerator;

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

  // Realtime subscription for transactions
  useEffect(() => {
    const channel = supabase
      .channel("landing-room-map")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          // Invalidate query to refresh data
          queryClient.invalidateQueries({ queryKey: ["public-transactions"] });
          
          // Show toast notification for relevant events
          if (payload.eventType === "INSERT") {
            toast.info("Có phòng giao dịch mới được tạo!", {
              description: "Sơ đồ bàn đã được cập nhật",
            });
          } else if (payload.eventType === "UPDATE") {
            const newData = payload.new as { buyer_id?: string; seller_id?: string };
            const oldData = payload.old as { buyer_id?: string; seller_id?: string };
            
            // Check if someone joined
            if ((!oldData.buyer_id && newData.buyer_id) || (!oldData.seller_id && newData.seller_id)) {
              toast.info("Có người vừa tham gia phòng!", {
                description: "Trạng thái bàn đã thay đổi",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
        hasBuyer: !!transaction.buyer_id,
        hasSeller: !!transaction.seller_id,
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
        return "hsl(var(--chart-1))"; // Blue
      default:
        return "hsl(var(--muted))";
    }
  };

  const getStatusBgClass = (status: RoomStatus, canEnter: boolean) => {
    switch (status) {
      case "available":
        return "bg-background hover:bg-muted/50 border-border";
      case "occupied":
        // Staff can always enter occupied rooms
        return canEnter 
          ? "bg-destructive/20 hover:bg-destructive/30 border-destructive/50 cursor-pointer"
          : "bg-destructive/20 border-destructive/50 cursor-not-allowed";
      case "pending":
        return "bg-chart-1/20 hover:bg-chart-1/30 border-chart-1/50";
      default:
        return "bg-muted";
    }
  };

  const handleTableClick = (table: TableData) => {
    // Staff can enter any room with a room_id
    if (isStaff && table.roomId) {
      navigate(`/join/${table.roomId}`);
      return;
    }

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

  const canEnterTable = (table: TableData) => {
    if (isStaff && table.roomId) return true;
    return table.status !== "occupied";
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
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-background border border-border"></div>
            <span className="text-sm text-muted-foreground">Trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-chart-1/60 border border-chart-1"></div>
            <span className="text-sm text-muted-foreground">Đang chờ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/60 border border-destructive"></div>
            <span className="text-sm text-muted-foreground">Có người</span>
          </div>
          {isStaff && (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-primary/10 border border-primary/30">
              {roles?.isAdmin ? <Shield className="w-4 h-4 text-primary" /> : <UserCog className="w-4 h-4 text-primary" />}
              <span className="text-sm text-primary font-medium">
                {roles?.isAdmin ? "Admin" : "GDV"} - Vào mọi phòng
              </span>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-muted/30 rounded-2xl p-6 md:p-8 border border-border"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {tables.map((table, index) => (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    delay: index * 0.03 
                  }}
                className={`
                  relative p-4 rounded-xl border-2 transition-colors duration-300
                  ${getStatusBgClass(table.status, canEnterTable(table))}
                  ${canEnterTable(table) ? "cursor-pointer" : ""}
                `}
                onClick={() => handleTableClick(table)}
                whileHover={canEnterTable(table) ? { scale: 1.05 } : {}}
                whileTap={canEnterTable(table) ? { scale: 0.98 } : {}}
                >
                  {/* Status indicator pulse for pending */}
                  {table.status === "pending" && (
                    <motion.div
                      className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-chart-1"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  {/* Table visualization */}
                  <div className="flex flex-col items-center">
                    {/* Top chairs */}
                    <div className="flex gap-2 mb-2">
                      <Chair filled={table.status === "occupied" || table.status === "pending"} color={getStatusColor(table.status)} />
                      <Chair filled={table.status === "occupied"} color={getStatusColor(table.status)} />
                    </div>
                    
                    {/* Table */}
                    <motion.div 
                      className="w-full h-12 rounded-lg flex items-center justify-center text-sm font-medium"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${getStatusColor(table.status)} 30%, transparent)`,
                        border: `2px solid ${getStatusColor(table.status)}`
                      }}
                      animate={table.status === "pending" ? { 
                        borderColor: [getStatusColor(table.status), "hsl(var(--primary))", getStatusColor(table.status)]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-foreground">Bàn {table.tableNumber}</span>
                    </motion.div>

                    {/* Bottom chairs */}
                    <div className="flex gap-2 mt-2">
                      <Chair filled={table.status === "occupied"} color={getStatusColor(table.status)} rotate />
                      <Chair filled={table.status === "occupied" || table.status === "pending"} color={getStatusColor(table.status)} rotate />
                    </div>
                  </div>

                  {/* Room info tooltip */}
                  {table.productName && (
                    <motion.div 
                      className="mt-3 text-center"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-xs text-foreground font-medium truncate">
                        {table.productName}
                      </p>
                      {table.amount && (
                        <p className="text-xs text-primary font-semibold">
                          {formatCurrency(table.amount)}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {table.status === "available" && (
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      Nhấn để tạo
                    </p>
                  )}
                  {table.status === "pending" && (
                    <motion.p 
                      className="text-xs text-center mt-2 text-chart-1"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Nhấn để tham gia
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
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
