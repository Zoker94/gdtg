import { useNavigate, Link } from "react-router-dom";
import { Shield, ArrowLeft, Phone, MessageCircle, ExternalLink } from "lucide-react";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerators } from "@/hooks/useModerators";

const ModeratorsListPage = () => {
  const navigate = useNavigate();
  const { data: moderators, isLoading } = useModerators();

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

        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Danh sách Giao Dịch Viên</h1>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : moderators?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Chưa có giao dịch viên nào</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {moderators?.map((mod) => (
                <Card 
                  key={mod.id} 
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/moderator/${mod.user_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={mod.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {mod.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{mod.display_name}</h3>
                          <Badge variant="secondary" className="text-xs">GDV</Badge>
                        </div>
                        {mod.specialization && (
                          <p className="text-sm text-muted-foreground mb-2">{mod.specialization}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {mod.phone && (
                            <Badge variant="outline" className="text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              {mod.phone}
                            </Badge>
                          )}
                          {mod.zalo_contact && (
                            <Badge variant="outline" className="text-xs">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Zalo
                            </Badge>
                          )}
                          {mod.facebook_url && (
                            <Badge variant="outline" className="text-xs">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Facebook
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModeratorsListPage;
