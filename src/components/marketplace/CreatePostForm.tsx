import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus, Send, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useCreatePost } from "@/hooks/useMarketplace";

const CreatePostForm = () => {
  const [content, setContent] = useState("");
  const { data: profile } = useProfile();
  const createPost = useCreatePost();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    await createPost.mutateAsync({ content: content.trim() });
    setContent("");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Bạn muốn đăng gì? Mua bán, trao đổi, chia sẻ..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-muted bg-muted/30"
            />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ImagePlus className="w-4 h-4 mr-2" />
                Thêm ảnh
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || createPost.isPending}
                size="sm"
                className="glow-primary"
              >
                {createPost.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Đăng bài
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePostForm;
