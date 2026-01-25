import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

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
    <section className="py-10 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Giao dịch trung gian <span className="text-primary">an toàn</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Mua bán tài khoản game, vật phẩm, dịch vụ một cách an toàn với hệ thống phòng giao dịch realtime
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6"
        >
          <Card 
            className="border-primary/20 hover:border-primary/50 transition-colors cursor-pointer" 
            onClick={handleCreateRoom}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Tạo phòng giao dịch
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Tạo phòng mới để bán hoặc mua. Nhận ID + mật khẩu để mời người còn lại.
              </p>
              <Button size="sm" className="w-full glow-primary">
                Bắt đầu ngay
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate("/join")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <LogIn className="w-4 h-4 text-muted-foreground" />
                Vào phòng
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Đã có ID và mật khẩu phòng? Vào ngay để tham gia giao dịch.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Nhập mã phòng
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </section>
  );
};

export default HeroSection;
