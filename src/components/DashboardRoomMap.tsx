import { useEffect, memo, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserCog } from "lucide-react";

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

// Memoized Chair component
const Chair = memo(({ 
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
      <path
        d="M4 2C4 1 5 0 6 0H18C19 0 20 1 20 2V8C20 9 19 10 18 10H6C5 10 4 9 4 8V2Z"
        fill={filled ? color : "transparent"}
        stroke={color}
        strokeWidth="1.5"
      />
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
      <line x1="5" y1="16" x2="5" y2="20" stroke={color} strokeWidth="1.5" />
      <line x1="19" y1="16" x2="19" y2="20" stroke={color} strokeWidth="1.5" />
    </svg>
  );
});
Chair.displayName = "Chair";

// Memoized Table component
const TableCell = memo(({ 
  table, 
  index,
  isStaff,
  onTableClick,
  getStatusColor,
  getStatusBgClass,
  canEnterTable,
  formatCurrency
}: { 
  table: TableData;
  index: number;
  isStaff: boolean;
  onTableClick: (table: TableData) => void;
  getStatusColor: (status: RoomStatus) => string;
  getStatusBgClass: (status: RoomStatus, canEnter: boolean) => string;
  canEnterTable: (table: TableData) => boolean;
  formatCurrency: (amount: number) => string;
}) => {
  const canEnter = canEnterTable(table);
  const statusColor = getStatusColor(table.status);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.05 
      }}
      className={`
        relative p-3 rounded-lg border-2 transition-colors duration-300
        ${getStatusBgClass(table.status, canEnter)}
        ${canEnter ? "cursor-pointer hover:scale-[1.02]" : ""}
      `}
      onClick={() => onTableClick(table)}
      whileHover={canEnter ? { scale: 1.02 } : {}}
      whileTap={canEnter ? { scale: 0.98 } : {}}
    >
      {table.status === "pending" && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-chart-1"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="flex flex-col items-center">
        <div className="flex gap-1 mb-1">
          <Chair 
            filled={table.status === "occupied" || table.status === "pending"} 
            color={statusColor} 
            size="sm"
          />
          <Chair 
            filled={table.status === "occupied"} 
            color={statusColor} 
            size="sm"
          />
        </div>
        
        <motion.div 
          className="w-full h-8 rounded flex items-center justify-center text-xs font-medium"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${statusColor} 20%, transparent)`,
            border: `1.5px solid ${statusColor}`
          }}
          animate={table.status === "pending" ? { 
            borderColor: [statusColor, "hsl(var(--primary))", statusColor]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-foreground">Bàn {table.tableNumber}</span>
        </motion.div>

        <div className="flex gap-1 mt-1">
          <Chair 
            filled={table.status === "occupied"} 
            color={statusColor} 
            rotate 
            size="sm"
          />
          <Chair 
            filled={table.status === "occupied" || table.status === "pending"} 
            color={statusColor} 
            rotate 
            size="sm"
          />
        </div>
      </div>

      {table.productName && (
        <motion.div 
          className="mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[10px] text-foreground font-medium truncate">
            {table.productName}
          </p>
          {table.amount && (
            <p className="text-[10px] text-primary font-semibold">
              {formatCurrency(table.amount)}
            </p>
          )}
        </motion.div>
      )}

      {table.status === "available" && (
        <p className="text-[10px] text-center mt-1 text-muted-foreground">
          Nhấn để tạo
        </p>
      )}
      {table.status === "pending" && (
        <motion.p 
          className="text-[10px] text-center mt-1 text-chart-1"
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Nhấn để tham gia
        </motion.p>
      )}
    </motion.div>
  );
});
TableCell.displayName = "TableCell";

const DashboardRoomMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roles } = useUserRole();
  const queryClient = useQueryClient();

  const isStaff = roles?.isAdmin || roles?.isModerator;

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
    staleTime: 1000 * 60, // 1 minute
  });

  // Realtime subscription - simplified
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-room-map")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["public-transactions-dashboard"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Memoized tables
  const tables: TableData[] = useMemo(() => 
    Array.from({ length: 4 }, (_, i) => {
      const transaction = transactions[i];
      
      if (transaction) {
        const hasBoth = transaction.buyer_id && transaction.seller_id;
        
        return {
          id: transaction.id,
          tableNumber: i + 1,
          status: hasBoth ? "occupied" as const : "pending" as const,
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
        status: "available" as const,
      };
    }), [transactions]
  );

  const getStatusColor = useCallback((status: RoomStatus) => {
    switch (status) {
      case "available":
        return "hsl(var(--muted-foreground))";
      case "occupied":
        return "hsl(var(--destructive))";
      case "pending":
        return "hsl(var(--chart-1))";
      default:
        return "hsl(var(--muted))";
    }
  }, []);

  const getStatusBgClass = useCallback((status: RoomStatus, canEnter: boolean) => {
    switch (status) {
      case "available":
        return "bg-background hover:bg-muted/50 border-border";
      case "occupied":
        return canEnter 
          ? "bg-destructive/10 hover:bg-destructive/20 border-destructive/50 cursor-pointer"
          : "bg-destructive/10 border-destructive/50 cursor-not-allowed";
      case "pending":
        return "bg-chart-1/20 hover:bg-chart-1/30 border-chart-1/50";
      default:
        return "bg-muted";
    }
  }, []);

  const handleTableClick = useCallback((table: TableData) => {
    if (isStaff && table.roomId) {
      navigate(`/join/${table.roomId}`);
      return;
    }

    if (table.status === "occupied") {
      toast.error("Bàn này đã có đủ người giao dịch");
      return;
    }

    if (table.status === "available") {
      navigate("/create-transaction");
      return;
    }

    if (table.roomId) {
      navigate(`/join/${table.roomId}`);
    } else {
      navigate("/join");
    }
  }, [isStaff, navigate]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  }, []);

  const canEnterTable = useCallback((table: TableData) => {
    if (isStaff && table.roomId) return true;
    return table.status !== "occupied";
  }, [isStaff]);

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
        <div className="flex flex-wrap justify-center gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-background border border-border"></div>
            <span className="text-muted-foreground">Trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-chart-1/60 border border-chart-1"></div>
            <span className="text-muted-foreground">Đang chờ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-destructive/60 border border-destructive"></div>
            <span className="text-muted-foreground">Có người</span>
          </div>
        </div>
        {isStaff && (
          <div className="flex items-center justify-center gap-2 mb-4 px-2 py-1.5 rounded bg-primary/10 border border-primary/30 text-xs">
            {roles?.isAdmin ? <Shield className="w-3 h-3 text-primary" /> : <UserCog className="w-3 h-3 text-primary" />}
            <span className="text-primary font-medium">
              {roles?.isAdmin ? "Admin" : "GDV"} - Vào mọi phòng
            </span>
          </div>
        )}

        {/* 2x2 Grid of tables */}
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {tables.map((table, index) => (
              <TableCell
                key={table.id}
                table={table}
                index={index}
                isStaff={!!isStaff}
                onTableClick={handleTableClick}
                getStatusColor={getStatusColor}
                getStatusBgClass={getStatusBgClass}
                canEnterTable={canEnterTable}
                formatCurrency={formatCurrency}
              />
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(DashboardRoomMap);
