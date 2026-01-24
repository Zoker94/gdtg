import { Shield, Facebook, MessageCircle, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { label: "Cách hoạt động", href: "#how-it-works" },
      { label: "Tính năng", href: "#features" },
      { label: "Bảng phí", href: "#pricing" },
      { label: "Hỏi đáp", href: "#faq" },
    ],
    company: [
      { label: "Về chúng tôi", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Tuyển dụng", href: "#" },
      { label: "Liên hệ", href: "#" },
    ],
    support: [
      { label: "Trung tâm hỗ trợ", href: "#" },
      { label: "Hướng dẫn sử dụng", href: "#" },
      { label: "Báo cáo lừa đảo", href: "#" },
      { label: "Trạng thái hệ thống", href: "#" },
    ],
    legal: [
      { label: "Điều khoản sử dụng", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Chính sách hoàn tiền", href: "#" },
    ],
  };

  const contacts = [
    { icon: Phone, text: "1900 xxxx xx", href: "tel:1900123456" },
    { icon: Mail, text: "support@escrowvn.com", href: "mailto:support@escrowvn.com" },
    { icon: MessageCircle, text: "Zalo: EscrowVN", href: "#" },
    { icon: Facebook, text: "Facebook", href: "#" },
  ];

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">EscrowVN</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs">
              Nền tảng giao dịch trung gian hàng đầu Việt Nam, bảo vệ người mua và người bán khỏi lừa đảo online.
            </p>
            <div className="space-y-2">
              {contacts.map((contact, index) => (
                <a
                  key={index}
                  href={contact.href}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <contact.icon className="w-4 h-4" />
                  <span>{contact.text}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Sản phẩm</h4>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Công ty</h4>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-3">
              {links.support.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Pháp lý</h4>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} EscrowVN. Bảo lưu mọi quyền.
          </p>
          <p className="text-muted-foreground text-sm">
            🇻🇳 Thiết kế và phát triển tại Việt Nam
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
