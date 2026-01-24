import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Lock, CheckCircle, FileCheck, Banknote, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  const steps = [
    { step: "1", title: "Tạo đơn", icon: FileCheck },
    { step: "2", title: "Đặt cọc", icon: Banknote },
    { step: "3", title: "Nhận hàng", icon: Package },
  ];

  return (
    <section className="relative min-h-[80vh] flex items-center pt-20">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            Giao dịch <span className="gradient-text">an toàn</span>
            <br />
            Chống lừa đảo <span className="gradient-text">100%</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-8"
          >
            Tiền được giữ an toàn cho đến khi cả hai bên xác nhận hài lòng.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
              Bắt đầu giao dịch
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6 mb-12"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Shield className="w-4 h-4 text-primary" />
              <span>Bảo mật SSL</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Lock className="w-4 h-4 text-primary" />
              <span>Tiền được bảo vệ</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Phí từ 3%</span>
            </div>
          </motion.div>

          {/* 3 Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            {steps.map((step) => (
              <div key={step.step} className="glass rounded-xl p-4 text-center relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {step.step}
                </div>
                <step.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">{step.title}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
