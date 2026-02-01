import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-4 px-4 border-t border-border bg-background/50">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground">GDTG</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <Link to="/terms" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
            Điều khoản
          </Link>
          <span>•</span>
          <span>© Bản quyền thuộc về Nguyễn Quốc Dũng</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
