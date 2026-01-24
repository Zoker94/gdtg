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

    const { data, error } = await supabase
      .from("transactions")
      .select("id, room_id, room_password, buyer_id, seller_id")
      .eq("room_id", roomId.toUpperCase())
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Lỗi", description: "Không tìm thấy phòng", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.room_password !== password) {
      toast({ title: "Lỗi", description: "Sai mật khẩu phòng", variant: "destructive" });
      setLoading(false);
      return;
    }

    // If user is not buyer or seller, set them as buyer
    if (user && data.buyer_id !== user.id && data.seller_id !== user.id) {
      if (!data.buyer_id) {
        await supabase
          .from("transactions")
          .update({ buyer_id: user.id })
          .eq("id", data.id);
      } else if (!data.seller_id) {
        await supabase
          .from("transactions")
          .update({ seller_id: user.id })
          .eq("id", data.id);
      }
    }

    toast({ title: "Thành công", description: "Đã vào phòng giao dịch" });
    navigate(`/transaction/${data.id}`);
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
