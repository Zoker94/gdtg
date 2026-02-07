import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import tetHorseCorner from "@/assets/tet-horse-corner.png";

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
    <section className="py-10 px-4 relative overflow-hidden">
      {/* Tết decorative emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-2 left-3 text-2xl animate-bounce" style={{ animationDuration: '3s' }}>🏮</div>
        <div className="absolute top-6 right-6 text-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🧧</div>
        <div className="absolute top-1/2 left-2 text-lg animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>🌸</div>
        <div className="absolute bottom-8 right-10 text-xl animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}>🎋</div>
        <div className="absolute top-20 left-1/4 text-lg animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '0.8s' }}>🎊</div>
        <div className="absolute bottom-16 left-10 text-xl animate-bounce" style={{ animationDuration: '2.6s', animationDelay: '1.2s' }}>🐴</div>
        <div className="absolute top-12 right-1/4 text-lg animate-bounce" style={{ animationDuration: '3.8s', animationDelay: '0.6s' }}>🎆</div>
        <div className="absolute bottom-4 right-1/3 text-lg animate-bounce" style={{ animationDuration: '3.1s', animationDelay: '0.9s' }}>🌺</div>
      </div>

      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-1.5 rounded-full text-xs font-semibold mb-3 border border-red-500/20">
            🐴 Chúc Mừng Năm Mới 2026 — Năm Bính Ngọ 🎊
          </div>
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
            className="border-primary/20 hover:border-primary/50 transition-all duration-300 cursor-pointer group relative overflow-hidden" 
            onClick={handleCreateRoom}
          >
            <img 
              src={tetHorseCorner} 
              alt="" 
              className="absolute bottom-2 right-2 w-20 h-20 object-contain opacity-[0.15] group-hover:opacity-[0.3] transition-opacity duration-500 pointer-events-none tet-horse" 
            />
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Tạo phòng giao dịch
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 relative z-10">
              <p className="text-xs text-muted-foreground mb-3">
                Tạo phòng mới để bán hoặc mua. Nhận ID + mật khẩu để mời người còn lại.
              </p>
              <Button size="sm" className="w-full tet-btn-primary">
                🐴 Bắt đầu ngay
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="border-border hover:border-primary/30 transition-all duration-300 cursor-pointer group relative overflow-hidden" 
            onClick={() => navigate("/join")}
          >
            <img 
              src={tetHorseCorner} 
              alt="" 
              className="absolute bottom-2 right-2 w-20 h-20 object-contain opacity-[0.15] group-hover:opacity-[0.3] transition-opacity duration-500 pointer-events-none scale-x-[-1] tet-horse"
            />
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <LogIn className="w-4 h-4 text-muted-foreground" />
                Vào phòng
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 relative z-10">
              <p className="text-xs text-muted-foreground mb-3">
                Đã có ID và mật khẩu phòng? Vào ngay để tham gia giao dịch.
              </p>
              <Button variant="outline" size="sm" className="w-full tet-btn-outline">
                🏮 Nhập mã phòng
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
