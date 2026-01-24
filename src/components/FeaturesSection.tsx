import { motion } from "framer-motion";
import { 
  Shield, 
  Clock, 
  MessageSquare, 
  FileWarning, 
  Calculator, 
  Smartphone 
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Bảo vệ người mua & người bán",
    description: "Tiền được giữ an toàn trong hệ thống cho đến khi cả hai bên xác nhận hài lòng. Không ai có thể lừa đảo.",
  },
  {
    icon: Clock,
    title: "Thời gian khiếu nại linh hoạt",
    description: "Tự do thiết lập thời gian khiếu nại từ 1 giờ đến 7 ngày tùy thuộc vào loại giao dịch của bạn.",
  },
  {
    icon: MessageSquare,
    title: "Chat trực tiếp trong giao dịch",
    description: "Trao đổi thông tin, gửi hình ảnh và cập nhật trạng thái ngay trong từng đơn hàng.",
  },
  {
    icon: FileWarning,
    title: "Hệ thống khiếu nại công bằng",
    description: "Khi có tranh chấp, Admin sẽ xem xét bằng chứng từ cả hai bên và đưa ra quyết định công bằng nhất.",
  },
  {
    icon: Calculator,
    title: "Phí minh bạch, tùy chỉnh",
    description: "Phí sàn từ 1-20%, có thể chọn người mua hoặc người bán chịu phí, hoặc chia đôi.",
  },
  {
    icon: Smartphone,
    title: "Giao diện thân thiện",
    description: "Thiết kế responsive hoàn hảo trên mọi thiết bị. Giao dịch mọi lúc mọi nơi từ điện thoại của bạn.",
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
            <span className="gradient-text">EscrowVN</span>?
          </h2>
          <p className="text-muted-foreground text-lg">
            Chúng tôi xây dựng hệ thống với tiêu chí an toàn, minh bạch và 
            công bằng cho mọi giao dịch online.
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
