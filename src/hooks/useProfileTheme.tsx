import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProfileTheme {
  id: string;
  user_id: string;
  gradient_id: string;
  frame_id: string;
  effect_id: string;
}

export const useProfileTheme = (userId?: string) => {
  return useQuery({
    queryKey: ["profile-theme", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profile_themes")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileTheme | null;
    },
    enabled: !!userId,
  });
};

export const useUpdateProfileTheme = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: { gradient_id?: string; frame_id?: string; effect_id?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Try upsert
      const { data, error } = await supabase
        .from("profile_themes")
        .upsert(
          { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-theme", user?.id] });
    },
  });
};
