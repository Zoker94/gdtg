import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import KYCForm from "@/components/KYCForm";

const KYCVerification = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để xác minh KYC</p>
          <Link to="/auth" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-display font-bold text-lg">GDTG</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <KYCForm />
      </main>
    </div>
  );
};

export default KYCVerification;
