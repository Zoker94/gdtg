import { motion } from "framer-motion";
import { 
  Shield, 
  Zap, 
  BarChart3, 
  Wallet, 
  Clock, 
  Users 
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Bảo mật tối đa",
    description: "Hệ thống bảo mật đa lớp với mã hóa 256-bit, xác thực 2 yếu tố và cold wallet lưu trữ.",
  },
  {
    icon: Zap,
    title: "Giao dịch siêu nhanh",
    description: "Xử lý hàng triệu giao dịch mỗi giây với độ trễ dưới 10ms, đảm bảo bạn không bỏ lỡ cơ hội.",
  },
  {
    icon: BarChart3,
    title: "Công cụ phân tích",
    description: "Biểu đồ chuyên nghiệp, chỉ báo kỹ thuật và tín hiệu giao dịch real-time từ chuyên gia.",
  },
  {
    icon: Wallet,
    title: "Phí thấp nhất",
    description: "Chỉ 0.1% phí giao dịch, miễn phí nạp rút và nhiều ưu đãi cho thành viên VIP.",
  },
  {
    icon: Clock,
    title: "Hỗ trợ 24/7",
    description: "Đội ngũ hỗ trợ chuyên nghiệp sẵn sàng giải đáp mọi thắc mắc bất kể ngày đêm.",
  },
  {
    icon: Users,
    title: "Cộng đồng lớn mạnh",
    description: "Tham gia cộng đồng hơn 2.5 triệu nhà đầu tư, chia sẻ kinh nghiệm và cơ hội giao dịch.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Tính năng nổi bật
          </span>
          <h2 className="font-display text-3xl lg:text-5xl font-bold mt-4 mb-6">
            Tại sao chọn{" "}
            <span className="gradient-text">TradeX</span>?
          </h2>
          <p className="text-muted-foreground text-lg">
            Nền tảng giao dịch được thiết kế với công nghệ hiện đại nhất, 
            đặt sự an toàn và tiện lợi của bạn lên hàng đầu.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group glass rounded-2xl p-8 hover:glow-soft transition-all duration-500"
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
