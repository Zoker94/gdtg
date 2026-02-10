import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MarketplacePost {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  category: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    reputation_score: number;
  };
  reactions?: PostReaction[];
  comments?: PostComment[];
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: "like" | "heart" | "laugh" | "angry";
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useMarketplacePosts = () => {
  return useQuery({
    queryKey: ["marketplace-posts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("marketplace_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all posts
      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, full_name, avatar_url, reputation_score")
        .in("user_id", userIds);

      // Fetch reactions for all posts
      const postIds = posts.map((p) => p.id);
      const { data: reactions } = await supabase
        .from("post_reactions")
        .select("*")
        .in("post_id", postIds);

      // Fetch comments for all posts
      const { data: comments } = await supabase
        .from("post_comments")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      // Fetch profiles for commenters
      const commenterIds = [...new Set(comments?.map((c) => c.user_id) || [])];
      const { data: commenterProfiles } = await supabase
        .from("profiles_public")
        .select("user_id, full_name, avatar_url")
        .in("user_id", commenterIds);

      return posts.map((post) => ({
        ...post,
        profile: profiles?.find((p) => p.user_id === post.user_id),
        reactions: reactions?.filter((r) => r.post_id === post.id) || [],
        comments:
          comments
            ?.filter((c) => c.post_id === post.id)
            .map((c) => ({
              ...c,
              profile: commenterProfiles?.find((p) => p.user_id === c.user_id),
            })) || [],
      })) as MarketplacePost[];
    },
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      content,
      images,
      category,
    }: {
      content: string;
      images?: string[];
      category?: string;
    }) => {
      if (!user) throw new Error("Bạn cần đăng nhập");

      const { data, error } = await supabase
        .from("marketplace_posts")
        .insert({
          user_id: user.id,
          content,
          images: images || [],
          category: category || "general",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-posts"] });
      toast.success("Đăng bài thành công!");
    },
    onError: (error) => {
      toast.error("Đăng bài thất bại: " + error.message);
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      images,
      category,
    }: {
      postId: string;
      content: string;
      images?: string[];
      category?: string;
    }) => {
      const { data, error } = await supabase
        .from("marketplace_posts")
        .update({
          content,
          images: images || [],
          category: category || "general",
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-posts"] });
      toast.success("Đã cập nhật bài viết!");
    },
    onError: (error) => {
      toast.error("Cập nhật thất bại: " + error.message);
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("marketplace_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-posts"] });
      toast.success("Đã xóa bài viết");
    },
    onError: (error) => {
      toast.error("Xóa bài thất bại: " + error.message);
    },
  });
};

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      reactionType,
    }: {
      postId: string;
      reactionType: "like" | "heart" | "laugh" | "angry";
    }) => {
      if (!user) throw new Error("Bạn cần đăng nhập");

      // Check if user already reacted
      const { data: existing } = await supabase
        .from("post_reactions")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          const { error } = await supabase
            .from("post_reactions")
            .delete()
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // Update reaction
          const { error } = await supabase
            .from("post_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existing.id);
          if (error) throw error;
        }
      } else {
        // Create new reaction
        const { error } = await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-posts"] });
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Bạn cần đăng nhập");

      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-posts"] });
      toast.success("Đã bình luận");
    },
    onError: (error) => {
      toast.error("Bình luận thất bại: " + error.message);
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-posts"] });
      toast.success("Đã xóa bình luận");
    },
  });
};
