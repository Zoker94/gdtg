import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerators } from "@/hooks/useModerators";
import { Users, ExternalLink, Phone, MessageCircle } from "lucide-react";

interface ModeratorsListProps {
  variant?: "compact" | "full";
  maxItems?: number;
}

const ModeratorsList = ({ variant = "compact", maxItems = 3 }: ModeratorsListProps) => {
  const navigate = useNavigate();
  const { data: moderators, isLoading } = useModerators();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!moderators || moderators.length === 0) {
    return null;
  }

  const displayModerators = maxItems ? moderators.slice(0, maxItems) : moderators;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Giao Dịch Viên
          <Badge variant="secondary" className="ml-auto">
            {moderators.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayModerators.map((mod) => (
            <div
              key={mod.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => navigate(`/moderator/${mod.user_id}`)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={mod.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {mod.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{mod.display_name}</p>
                {mod.specialization && (
                  <p className="text-xs text-muted-foreground truncate">
                    {mod.specialization}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {mod.phone && (
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                {(mod.facebook_url || mod.zalo_contact) && (
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>

        {moderators.length > maxItems && (
          <Button 
            variant="ghost" 
            className="w-full mt-2 text-sm"
            onClick={() => navigate("/moderators")}
          >
            Xem tất cả
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ModeratorsList;
