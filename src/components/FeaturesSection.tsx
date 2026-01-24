import { Shield, Lock, MessageCircle, AlertTriangle, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Lock,
    title: "Phòng bảo mật",
    description: "ID + mật khẩu 4 số, chỉ người có thông tin mới vào được",
  },
  {
    icon: MessageCircle,
    title: "Chat realtime",
    description: "Trao đổi trực tiếp trong phòng giao dịch",
  },
  {
    icon: Shield,
    title: "Tiền được bảo vệ",
    description: "Tiền giữ tại sàn cho đến khi người mua xác nhận",
  },
  {
    icon: AlertTriangle,
    title: "Khiếu nại nhanh",
    description: "Admin hỗ trợ giải quyết tranh chấp",
  },
  {
    icon: Zap,
    title: "Giải ngân tức thì",
    description: "Xác nhận xong, tiền chuyển ngay cho người bán",
  },
  {
    icon: Users,
    title: "Hỗ trợ đa dạng",
    description: "Acc game, skin, dịch vụ cày thuê, sản phẩm số",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-12 px-4 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-8">Tại sao chọn chúng tôi?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-card rounded-lg border border-border"
            >
              <feature.icon className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
