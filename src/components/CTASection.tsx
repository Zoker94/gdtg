import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 lg:py-24 relative">
      <div className="absolute inset-0 bg-primary/5 rounded-3xl mx-4" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10 text-center">
        <h2 className="font-display text-2xl lg:text-4xl font-bold mb-4">
          Sẵn sàng <span className="gradient-text">giao dịch an toàn</span>?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Đăng ký miễn phí, phí giao dịch chỉ từ 3%
        </p>
        <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
          Tạo tài khoản miễn phí
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
