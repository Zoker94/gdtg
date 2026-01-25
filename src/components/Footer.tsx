import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-6 px-4 border-t border-border">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">GDTG</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Giao dịch trung gian an toàn cho game thủ Việt
          </p>
          <p className="text-xs text-muted-foreground">
            © Bản quyền website thuộc về Nguyễn Quốc Dũng
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
