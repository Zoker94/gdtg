import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import CreatePostForm from "./CreatePostForm";
import PostCard from "./PostCard";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";
import { useMarketplacePosts } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";

const MarketplaceFeed = () => {
  const { user } = useAuth();
  const { data: posts, isLoading } = useMarketplacePosts();

  return (
    <div className="space-y-4">
      {/* Create Post Form - only for logged in users */}
      {user && <CreatePostForm />}

      {/* Posts Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts?.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Chưa có bài đăng nào</p>
            <p className="text-sm text-muted-foreground mt-1">
              Hãy là người đầu tiên đăng bài mua bán!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplaceFeed;
