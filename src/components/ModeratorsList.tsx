import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeratorGridSkeleton } from "@/components/skeletons/ModeratorGridSkeleton";
import { useModerators } from "@/hooks/useModerators";
import { Users, ExternalLink } from "lucide-react";

interface ModeratorsListProps {
  variant?: "compact" | "full";
  maxItems?: number;
}

const ModeratorsList = ({ variant = "compact", maxItems = 6 }: ModeratorsListProps) => {
  const navigate = useNavigate();
  const { data: moderators, isLoading } = useModerators();

  if (isLoading) {
    return <ModeratorGridSkeleton count={maxItems} />;
  }

  if (!moderators || moderators.length === 0) {
    return null;
  }

  const displayModerators = maxItems ? moderators.slice(0, maxItems) : moderators;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Giao Dịch Viên theo số thứ tự:
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {displayModerators.map((mod, index) => (
            <div
              key={mod.id}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
              onClick={() => navigate(`/moderator/${mod.user_id}`)}
            >
              <div className="relative">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-border group-hover:ring-primary transition-all">
                  <AvatarImage src={mod.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {mod.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-xs text-center font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {index + 1}. {mod.display_name}
              </p>
            </div>
          ))}
        </div>

        {moderators.length > maxItems && (
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => navigate("/moderators-full")}
          >
            Xem tất cả ({moderators.length})
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ModeratorsList;
