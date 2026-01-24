import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">EscrowVN</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              Cách hoạt động
            </a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Tính năng
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Bảng phí
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              Hỏi đáp
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Button variant="hero" onClick={() => navigate("/dashboard")}>
                Vào Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  Đăng nhập
                </Button>
                <Button variant="hero" onClick={() => navigate("/auth")}>
                  Đăng ký miễn phí
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-border"
          >
            <nav className="flex flex-col gap-4">
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Cách hoạt động
              </a>
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Tính năng
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Bảng phí
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Hỏi đáp
              </a>
              <div className="flex flex-col gap-2 pt-4">
                {user ? (
                  <Button variant="hero" onClick={() => navigate("/dashboard")}>
                    Vào Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => navigate("/auth")}>
                      Đăng nhập
                    </Button>
                    <Button variant="hero" onClick={() => navigate("/auth")}>
                      Đăng ký miễn phí
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
