import { motion } from "framer-motion";
import { Shield, Clock, MessageSquare, FileWarning } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Bảo vệ hai bên",
    description: "Tiền giữ an toàn cho đến khi cả hai hài lòng.",
  },
  {
    icon: Clock,
    title: "Thời gian khiếu nại",
    description: "Tự do thiết lập từ 1 giờ đến 7 ngày.",
  },
  {
    icon: MessageSquare,
    title: "Chat trực tiếp",
    description: "Trao đổi ngay trong từng đơn hàng.",
  },
  {
    icon: FileWarning,
    title: "Khiếu nại công bằng",
    description: "Admin xem xét và quyết định công bằng.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-2xl lg:text-4xl font-bold mb-4">
            Tại sao chọn <span className="gradient-text">EscrowVN</span>?
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-6 text-center"
            >
              <feature.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
