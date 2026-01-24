import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import TransactionRoomMap from "./TransactionRoomMap";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateRoom = () => {
    if (user) {
      navigate("/create-transaction");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Giao dịch trung gian <span className="text-primary">an toàn</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Mua bán tài khoản game, vật phẩm, dịch vụ một cách an toàn với hệ thống phòng giao dịch realtime
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <Card 
            className="border-primary/20 hover:border-primary/50 transition-colors cursor-pointer" 
            onClick={handleCreateRoom}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Tạo phòng giao dịch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tạo phòng mới để bán hoặc mua. Nhận ID + mật khẩu để mời người còn lại.
              </p>
              <Button className="w-full glow-primary">
                Bắt đầu ngay
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate("/join")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="w-5 h-5 text-muted-foreground" />
                Vào phòng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Đã có ID và mật khẩu phòng? Vào ngay để tham gia giao dịch.
              </p>
              <Button variant="outline" className="w-full">
                Nhập mã phòng
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction Room Map */}
      <TransactionRoomMap />
    </section>
  );
};

export default HeroSection;
