import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Shield,
  Search,
  TrendingUp,
  Package,
  User,
  AlertTriangle,
} from "lucide-react";
import Footer from "@/components/Footer";

const SearchProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // Auto-search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setDebouncedTerm("");
      return;
    }
    const timer = setTimeout(() => setDebouncedTerm(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["search-profiles", debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || debouncedTerm.length < 2) return [];

      // Search by name
      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .ilike("full_name", `%${debouncedTerm}%`)
        .order("reputation_score", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Search error:", error);
        throw error;
      }

      // Also search by user_id prefix if term is 8+ chars
      if (debouncedTerm.length >= 8) {
        const { data: idMatch } = await supabase
          .from("profiles_public")
          .select("*")
          .filter("user_id", "ilike", `${debouncedTerm}%`)
          .limit(5);

        if (idMatch && idMatch.length > 0) {
          const existingIds = new Set(data?.map((p) => p.id) || []);
          const uniqueIdMatches = idMatch.filter((p) => !existingIds.has(p.id));
          return [...(data || []), ...uniqueIdMatches];
        }
      }

      return data || [];
    },
    enabled: !!user && debouncedTerm.length >= 2,
  });

  const getReputationColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full border-border">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Vui lòng đăng nhập</p>
            <Button onClick={() => navigate("/auth")}>Đăng nhập</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">GDTG</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <Card className="border-border mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Tìm kiếm người dùng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nhập tên hoặc ID người dùng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tự động tìm kiếm khi nhập từ 2 ký tự
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : profiles && profiles.length > 0 ? (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <Card
                  key={profile.id}
                  className="border-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => profile.user_id && navigate(`/user/${profile.user_id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10">
                          {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {profile.full_name || "Người dùng"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          ID: {profile.user_id?.slice(0, 8) ?? "N/A"}...
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`w-4 h-4 ${getReputationColor(profile.reputation_score ?? 50)}`} />
                          <span className={getReputationColor(profile.reputation_score ?? 50)}>
                            {profile.reputation_score ?? 50}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>{profile.total_transactions ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : debouncedTerm.length >= 2 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center">
                <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Không tìm thấy người dùng nào</p>
              </CardContent>
            </Card>
          ) : null}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchProfile;
