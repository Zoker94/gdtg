import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import CreatePostForm from "./CreatePostForm";
import PostCard from "./PostCard";
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
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
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
