import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Copy, Loader2, Users, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface TransactionData {
  id: string;
  room_id: string;
  room_password: string;
  seller_id: string | null;
  product_name: string;
  amount: number;
  status: string;
}

const WaitingLobby = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellerJoined, setSellerJoined] = useState(false);

  // Fetch initial transaction data
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionId) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, room_id, room_password, seller_id, product_name, amount, status")
        .eq("id", transactionId)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Lỗi", description: "Không tìm thấy phòng", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      setTransaction(data);
      setLoading(false);

      // Check if seller already joined and set up product
      if (data.seller_id && data.amount > 0 && data.product_name !== "Phòng người mua") {
        setSellerJoined(true);
        // Auto redirect after short delay
        setTimeout(() => {
          navigate(`/transaction/${transactionId}`);
        }, 1500);
      }
    };

    fetchTransaction();
  }, [transactionId, navigate]);

  // Realtime subscription for seller joining
  useEffect(() => {
    if (!transactionId) return;

    const channel = supabase
      .channel(`lobby-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          const newData = payload.new as TransactionData;
          setTransaction(newData);

          // Check if seller joined and filled product info
          if (
            newData.seller_id &&
            newData.amount > 0 &&
            newData.product_name !== "Phòng người mua" &&
            newData.product_name !== "Phòng giao dịch viên"
          ) {
            setSellerJoined(true);
            toast({
              title: "🎉 Người bán đã vào phòng!",
              description: "Đang chuyển bạn vào bàn giao dịch...",
            });

            // Auto redirect after animation
            setTimeout(() => {
              navigate(`/transaction/${transactionId}`);
            }, 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, navigate]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép", description: `${label} đã được sao chép` });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">GDTG</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4">
                {sellerJoined ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 rounded-full bg-muted flex items-center justify-center"
                  >
                    <Clock className="w-10 h-10 text-muted-foreground" />
                  </motion.div>
                )}
              </div>

              <CardTitle className="text-xl">
                {sellerJoined ? "Người bán đã vào!" : "Sảnh chờ giao dịch"}
              </CardTitle>
              <CardDescription>
                {sellerJoined
                  ? "Đang chuyển bạn vào bàn giao dịch..."
                  : "Đang chờ người bán tham gia và đăng thông tin sản phẩm"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Room credentials */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  Gửi thông tin này cho người bán để họ vào phòng:
                </p>

                <div className="flex items-center justify-between bg-background rounded-md p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">ID Phòng</p>
                    <p className="font-mono font-bold text-lg tracking-widest">
                      {transaction.room_id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(transaction.room_id || "", "ID phòng")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-background rounded-md p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Mật khẩu</p>
                    <p className="font-mono font-bold text-lg tracking-widest">
                      {transaction.room_password}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(transaction.room_password || "", "Mật khẩu")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Waiting animation */}
              {!sellerJoined && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Users className="w-5 h-5 text-primary" />
                  </motion.div>
                  <span className="text-sm text-muted-foreground">
                    Đang chờ người bán...
                  </span>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Instructions */}
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>Bạn sẽ được tự động chuyển vào bàn giao dịch</p>
                <p>khi người bán đăng thông tin sản phẩm</p>
              </div>

              {/* Manual enter button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (sellerJoined) {
                    navigate(`/transaction/${transactionId}`);
                  } else {
                    toast({
                      title: "Chưa thể vào phòng",
                      description: "Vui lòng chờ người bán vào và đăng thông tin sản phẩm",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={sellerJoined}
              >
                {sellerJoined ? "Đang chuyển hướng..." : "Vào phòng thủ công"}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                Quay lại Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default WaitingLobby;
