import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

interface TransactionResult {
  id: string;
  room_id: string;
  product_name: string;
  category: string | null;
  amount: number;
  seller_id: string | null;
}

const categoryLabels: Record<string, string> = {
  "game-account": "Tài khoản game",
  "game-item": "Vật phẩm game",
  "service": "Dịch vụ",
  "topup": "Nạp game",
  "other": "Khác",
};

const SearchRoom = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TransactionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập từ khóa tìm kiếm", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("id, room_id, product_name, category, amount, seller_id")
      .eq("status", "pending")
      .ilike("product_name", `%${searchQuery}%`)
      .not("seller_id", "is", null)
      .is("buyer_id", null)
      .limit(20);

    if (error) {
      toast({ title: "Lỗi", description: "Không thể tìm kiếm", variant: "destructive" });
    } else {
      setResults(data || []);
    }

    setLoading(false);
  };

  const handleJoinRoom = (transaction: TransactionResult) => {
    if (!user) {
      toast({ title: "Yêu cầu đăng nhập", description: "Vui lòng đăng nhập để vào phòng", variant: "destructive" });
      navigate("/auth");
      return;
    }

    const userBalance = profile?.balance || 0;
    
    if (userBalance < transaction.amount) {
      toast({ 
        title: "Số dư không đủ", 
        description: `Bạn cần có ít nhất ${transaction.amount.toLocaleString()}đ để vào phòng này. Số dư hiện tại: ${userBalance.toLocaleString()}đ`, 
        variant: "destructive" 
      });
      return;
    }

    navigate(`/join/${transaction.room_id}`);
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

        <Card className="max-w-2xl mx-auto border-border mb-8">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Search className="w-5 h-5" />
              Tìm phòng giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên sản phẩm cần tìm..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} className="glow-primary">
                {loading ? "Đang tìm..." : "Tìm"}
              </Button>
            </div>

            {profile && (
              <p className="text-sm text-muted-foreground text-center">
                Số dư hiện tại: <span className="font-semibold text-primary">{profile.balance.toLocaleString()}đ</span>
              </p>
            )}
          </CardContent>
        </Card>

        {searched && (
          <div className="max-w-2xl mx-auto">
            {results.length === 0 ? (
              <p className="text-center text-muted-foreground">Không tìm thấy phòng nào</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Tìm thấy {results.length} phòng</p>
                {results.map((tx) => (
                  <Card key={tx.id} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-primary" />
                        <div>
                          <h3 className="font-semibold">{tx.product_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabels[tx.category || "other"]}
                            </Badge>
                            <span className="text-sm font-bold text-primary">
                              {tx.amount.toLocaleString()}đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleJoinRoom(tx)}
                        disabled={profile && profile.balance < tx.amount}
                      >
                        Vào phòng
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchRoom;
