import { TrendingUp, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { label: "Tính năng", href: "#features" },
      { label: "Bảng giá", href: "#pricing" },
      { label: "API", href: "#" },
      { label: "Ứng dụng di động", href: "#" },
    ],
    company: [
      { label: "Về chúng tôi", href: "#about" },
      { label: "Tuyển dụng", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Liên hệ", href: "#contact" },
    ],
    support: [
      { label: "Trung tâm hỗ trợ", href: "#" },
      { label: "Hướng dẫn", href: "#" },
      { label: "Cộng đồng", href: "#" },
      { label: "Trạng thái hệ thống", href: "#" },
    ],
    legal: [
      { label: "Điều khoản sử dụng", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Cookie", href: "#" },
    ],
  };

  const socials = [
    { icon: Facebook, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Linkedin, href: "#" },
    { icon: Youtube, href: "#" },
  ];

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">TradeX</span>
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs">
              Nền tảng giao dịch tài sản số hàng đầu Việt Nam với hơn 2.5 triệu người dùng tin tưởng.
            </p>
            <div className="flex items-center gap-4">
              {socials.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <social.icon className="w-5 h-5" />
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
            © {currentYear} TradeX. Bảo lưu mọi quyền.
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
