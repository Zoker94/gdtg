import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold">EscrowVN</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Giao dịch trung gian an toàn cho game thủ Việt
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-primary">Đăng nhập</Link>
            <Link to="/join" className="hover:text-primary">Vào phòng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
