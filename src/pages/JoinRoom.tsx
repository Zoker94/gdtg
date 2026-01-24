import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Shield, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const JoinRoom = () => {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState(urlRoomId || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!roomId.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập ID phòng", variant: "destructive" });
      return;
    }
    if (!password.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mật khẩu phòng", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("id, room_id, room_password, buyer_id, seller_id, amount")
      .eq("room_id", roomId.toUpperCase())
      .maybeSingle();

    if (error || !transaction) {
      toast({ title: "Lỗi", description: "Không tìm thấy phòng", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (transaction.room_password !== password) {
      toast({ title: "Lỗi", description: "Sai mật khẩu phòng", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Determine which role the joining user will take
    const isAlreadyParticipant = user && (transaction.buyer_id === user.id || transaction.seller_id === user.id);
    
    if (isAlreadyParticipant) {
      // User is already in this transaction, just navigate
      toast({ title: "Thành công", description: "Đã vào phòng giao dịch" });
      navigate(`/transaction/${transaction.id}`);
      setLoading(false);
      return;
    }

    // Check if room is full
    if (transaction.buyer_id && transaction.seller_id) {
      toast({ title: "Lỗi", description: "Phòng đã có đủ người giao dịch", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Determine role for the new participant
    let roleToAssign: "buyer" | "seller" | null = null;
    
    if (transaction.seller_id && !transaction.buyer_id) {
      // Seller exists, new person is buyer
      roleToAssign = "buyer";
    } else if (transaction.buyer_id && !transaction.seller_id) {
      // Buyer exists, new person is seller
      roleToAssign = "seller";
    } else if (!transaction.seller_id && !transaction.buyer_id) {
      // No one assigned yet - shouldn't happen normally, but default to seller
      roleToAssign = "seller";
    }

    // If joining as buyer, check balance
    if (roleToAssign === "buyer" && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const userBalance = profile?.balance || 0;
      
      if (userBalance < transaction.amount) {
        toast({ 
          title: "Số dư không đủ", 
          description: `Bạn cần có ít nhất ${transaction.amount.toLocaleString()}đ để vào phòng này. Số dư hiện tại: ${userBalance.toLocaleString()}đ`, 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
    }

    // Update the transaction with the new participant
    if (roleToAssign && user) {
      const updateData = roleToAssign === "buyer" 
        ? { buyer_id: user.id } 
        : { seller_id: user.id };
      
      const { error: updateError } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transaction.id);

      if (updateError) {
        console.error("Update error:", updateError);
        toast({ 
          title: "Lỗi", 
          description: "Không thể tham gia phòng. Vui lòng thử lại.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      toast({ 
        title: "Thành công", 
        description: `Bạn đã vào phòng với vai trò ${roleToAssign === "buyer" ? "Người mua" : "Người bán"}` 
      });
    }

    navigate(`/transaction/${transaction.id}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">EscrowVN</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card className="max-w-md mx-auto border-border">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              Vào phòng giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">ID Phòng</label>
              <Input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="VD: ABC123"
                className="text-center text-lg tracking-widest font-mono"
                maxLength={6}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Mật khẩu</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4 số"
                className="text-center text-lg tracking-widest font-mono"
                maxLength={4}
              />
            </div>

            <Button
              onClick={handleJoin}
              className="w-full glow-primary"
              size="lg"
              disabled={loading}
            >
              {loading ? "Đang kiểm tra..." : "Vào phòng"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Bạn cần ID và mật khẩu từ người tạo phòng
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JoinRoom;
