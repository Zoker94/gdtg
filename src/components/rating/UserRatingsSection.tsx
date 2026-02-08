import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRatings, useUserAverageRating, RATING_TAGS } from "@/hooks/useUserRatings";
import { Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface UserRatingsSectionProps {
  userId: string;
}

const getTagLabel = (tagValue: string): string => {
  const tag = RATING_TAGS.find((t) => t.value === tagValue);
  return tag?.label || tagValue;
};

const UserRatingsSection = ({ userId }: UserRatingsSectionProps) => {
  const { data: ratings, isLoading } = useUserRatings(userId);
  const { average, count } = useUserAverageRating(userId);

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            Đánh giá từ người dùng
          </span>
          {count > 0 && (
            <Badge variant="secondary" className="font-normal">
              {average} ⭐ ({count} đánh giá)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ratings || ratings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có đánh giá nào</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {ratings.map((rating, index) => (
              <motion.div
                key={rating.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={rating.rater_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-sm">
                      {rating.rater_profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {rating.rater_profile?.full_name || "Người dùng"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(rating.created_at), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            rating.rating >= star
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Tags */}
                    {rating.tags && rating.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rating.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] h-5 font-normal"
                          >
                            {getTagLabel(tag)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Comment */}
                    {rating.comment && (
                      <p className="text-sm text-muted-foreground">
                        "{rating.comment}"
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserRatingsSection;
