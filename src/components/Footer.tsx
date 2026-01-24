import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-8">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold">EscrowVN</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EscrowVN. Giao dịch an toàn.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
