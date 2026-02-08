import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useCreateRating, RATING_TAGS } from "@/hooks/useUserRatings";
import { cn } from "@/lib/utils";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  ratedUserId: string;
  ratedUserName?: string;
}

const RatingDialog = ({
  open,
  onOpenChange,
  transactionId,
  ratedUserId,
  ratedUserName = "người dùng",
}: RatingDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const createRating = useCreateRating();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    await createRating.mutateAsync({
      transactionId,
      ratedUserId,
      rating,
      comment: comment.trim() || undefined,
      tags: selectedTags,
    });

    // Reset and close
    setRating(0);
    setComment("");
    setSelectedTags([]);
    onOpenChange(false);
  };

  const getRatingLabel = (value: number) => {
    if (value >= 5) return "Xuất sắc";
    if (value >= 4) return "Tốt";
    if (value >= 3) return "Bình thường";
    if (value >= 2) return "Tệ";
    if (value >= 1) return "Rất tệ";
    return "Chọn số sao";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đánh giá giao dịch</DialogTitle>
          <DialogDescription>
            Chia sẻ trải nghiệm của bạn với {ratedUserName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Star Rating */}
          <div className="text-center space-y-2">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-colors",
                      (hoverRating || rating) >= star
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </motion.button>
              ))}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {getRatingLabel(hoverRating || rating)}
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Nhãn đánh giá (tùy chọn)</p>
            <div className="flex flex-wrap gap-2">
              {RATING_TAGS.map((tag) => (
                <Badge
                  key={tag.value}
                  variant={selectedTags.includes(tag.value) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedTags.includes(tag.value) && "glow-primary"
                  )}
                  onClick={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Nhận xét (tùy chọn)</p>
            <Textarea
              placeholder="Chia sẻ thêm về trải nghiệm giao dịch của bạn..."
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/200
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            className="flex-1 glow-primary"
            onClick={handleSubmit}
            disabled={rating === 0 || createRating.isPending}
          >
            {createRating.isPending ? "Đang gửi..." : "Gửi đánh giá"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;
