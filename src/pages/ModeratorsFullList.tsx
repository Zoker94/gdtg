import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, ArrowLeft, Phone, MessageCircle, ExternalLink, Search, Filter, User } from "lucide-react";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModerators } from "@/hooks/useModerators";

const ModeratorsFullList = () => {
  const navigate = useNavigate();
  const { data: moderators, isLoading } = useModerators();
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");

  // Get unique specializations for filter
  const specializations = useMemo(() => {
    if (!moderators) return [];
    const specs = moderators
      .map((m) => m.specialization)
      .filter((s): s is string => !!s);
    return [...new Set(specs)];
  }, [moderators]);

  // Filtered moderators
  const filteredModerators = useMemo(() => {
    if (!moderators) return [];
    return moderators.filter((mod) => {
      const matchesSearch =
        mod.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpecialization =
        specializationFilter === "all" || mod.specialization === specializationFilter;
      return matchesSearch && matchesSpecialization;
    });
  }, [moderators, searchQuery, specializationFilter]);

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

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Danh sách Giao Dịch Viên</h1>
          <p className="text-muted-foreground text-sm">
            Đội ngũ giao dịch viên chuyên nghiệp hỗ trợ bạn giao dịch an toàn
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, mô tả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Chuyên môn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả chuyên môn</SelectItem>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Tìm thấy {filteredModerators.length} giao dịch viên
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : filteredModerators.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || specializationFilter !== "all"
                  ? "Không tìm thấy giao dịch viên phù hợp"
                  : "Chưa có giao dịch viên nào"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModerators.map((mod, index) => (
              <Card
                key={mod.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/moderator/${mod.user_id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={mod.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {mod.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -top-1 -left-1 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base">{mod.display_name}</h3>
                        <Badge variant="secondary" className="text-xs">GDV</Badge>
                      </div>
                      {mod.specialization && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {mod.specialization}
                        </Badge>
                      )}
                      {mod.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {mod.bio}
                        </p>
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
      </main>
      <Footer />
    </div>
  );
};

export default ModeratorsFullList;
