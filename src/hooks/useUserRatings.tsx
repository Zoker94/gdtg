import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserRating {
  id: string;
  transaction_id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  rater_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Available rating tags
export const RATING_TAGS = [
  { value: "fast_delivery", label: "Giao hàng nhanh" },
  { value: "trustworthy", label: "Uy tín" },
  { value: "good_communication", label: "Giao tiếp tốt" },
  { value: "accurate_description", label: "Đúng mô tả" },
  { value: "fair_price", label: "Giá hợp lý" },
  { value: "professional", label: "Chuyên nghiệp" },
] as const;

// Get all ratings for a user
export const useUserRatings = (userId?: string) => {
  return useQuery({
    queryKey: ["user-ratings", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_ratings")
        .select("*")
        .eq("rated_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch rater profiles
      const raterIds = [...new Set(data.map((r) => r.rater_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", raterIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return data.map((rating) => ({
        ...rating,
        tags: rating.tags || [],
        rater_profile: profileMap.get(rating.rater_id) || null,
      })) as UserRating[];
    },
    enabled: !!userId,
  });
};

// Get average rating for a user
export const useUserAverageRating = (userId?: string) => {
  const { data: ratings } = useUserRatings(userId);
  
  if (!ratings || ratings.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Math.round((sum / ratings.length) * 10) / 10,
    count: ratings.length,
  };
};

// Check if user can rate for a specific transaction
export const useCanRateTransaction = (transactionId?: string) => {
  return useQuery({
    queryKey: ["can-rate-transaction", transactionId],
    queryFn: async () => {
      if (!transactionId) return { canRate: false, existingRating: null };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { canRate: false, existingRating: null };

      // Check if already rated
      const { data: existingRating } = await supabase
        .from("user_ratings")
        .select("*")
        .eq("transaction_id", transactionId)
        .eq("rater_id", user.id)
        .maybeSingle();

      // Check if transaction is completed and user is participant
      const { data: transaction } = await supabase
        .from("transactions")
        .select("status, buyer_id, seller_id")
        .eq("id", transactionId)
        .single();

      if (!transaction || transaction.status !== "completed") {
        return { canRate: false, existingRating: existingRating as UserRating | null };
      }

      const isParticipant = transaction.buyer_id === user.id || transaction.seller_id === user.id;
      
      return {
        canRate: isParticipant && !existingRating,
        existingRating: existingRating as UserRating | null,
        otherUserId: transaction.buyer_id === user.id ? transaction.seller_id : transaction.buyer_id,
      };
    },
    enabled: !!transactionId,
  });
};

// Create a rating
export const useCreateRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      ratedUserId,
      rating,
      comment,
      tags,
    }: {
      transactionId: string;
      ratedUserId: string;
      rating: number;
      comment?: string;
      tags?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      const { data, error } = await supabase
        .from("user_ratings")
        .insert({
          transaction_id: transactionId,
          rater_id: user.id,
          rated_user_id: ratedUserId,
          rating,
          comment: comment || null,
          tags: tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-ratings", variables.ratedUserId] });
      queryClient.invalidateQueries({ queryKey: ["can-rate-transaction", variables.transactionId] });
      toast.success("Đã gửi đánh giá thành công!");
    },
    onError: (error) => {
      toast.error("Không thể gửi đánh giá: " + (error as Error).message);
    },
  });
};
