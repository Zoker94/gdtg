import { useParams, useNavigate, Link } from "react-router-dom";
import { Shield, ArrowLeft, Phone, MessageCircle, ExternalLink, Building, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useModeratorProfile } from "@/hooks/useModerators";

const ModeratorProfile = () => {
  const { moderatorId } = useParams();
  const navigate = useNavigate();
  const { data: moderator, isLoading } = useModeratorProfile(moderatorId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-xl">GDTG</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 max-w-2xl mx-auto" />
        </main>
      </div>
    );
  }

  if (!moderator) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-xl">GDTG</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Không tìm thấy thông tin giao dịch viên</p>
          <Button variant="link" onClick={() => navigate(-1)}>Quay lại</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">GDTG</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-2">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={moderator.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {moderator.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              {moderator.display_name}
              <Badge variant="secondary" className="ml-2">
                <User className="w-3 h-3 mr-1" />
                Giao dịch viên
              </Badge>
            </CardTitle>
            {moderator.specialization && (
              <p className="text-muted-foreground">{moderator.specialization}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {moderator.bio && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{moderator.bio}</p>
              </div>
            )}

            <div className="grid gap-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">Liên hệ</h3>
                <div className="space-y-2">
                  {moderator.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>{moderator.phone}</span>
                    </div>
                  )}
                  {moderator.zalo_contact && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      <span>Zalo: {moderator.zalo_contact}</span>
                    </div>
                  )}
                  {moderator.facebook_url && (
                    <a 
                      href={moderator.facebook_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-primary" />
                      <span className="text-primary">Facebook</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Bank Info */}
              {moderator.bank_name && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">Thông tin ngân hàng</h3>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{moderator.bank_name}</span>
                    </div>
                    {moderator.bank_account_number && (
                      <p className="font-mono text-sm">{moderator.bank_account_number}</p>
                    )}
                    {moderator.bank_account_name && (
                      <p className="text-sm text-muted-foreground">{moderator.bank_account_name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ModeratorProfile;
