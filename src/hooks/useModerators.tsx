import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ModeratorProfile {
  id: string;
  user_id: string;
  display_name: string;
  facebook_url: string | null;
  zalo_contact: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  specialization: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useModerators = () => {
  return useQuery({
    queryKey: ["moderators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_profiles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ModeratorProfile[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - moderators rarely change
    gcTime: 1000 * 60 * 15, // 15 minutes cache
  });
};

export const useAllModerators = () => {
  return useQuery({
    queryKey: ["all-moderators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ModeratorProfile[];
    },
  });
};

export const useModeratorProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["moderator-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ModeratorProfile | null;
    },
    enabled: !!userId,
  });
};

export const useCreateModeratorProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Omit<ModeratorProfile, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("moderator_profiles")
        .insert(profile)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderators"] });
      queryClient.invalidateQueries({ queryKey: ["all-moderators"] });
      toast({ title: "Đã tạo hồ sơ quản lý!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateModeratorProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ModeratorProfile> }) => {
      const { error } = await supabase
        .from("moderator_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderators"] });
      queryClient.invalidateQueries({ queryKey: ["all-moderators"] });
      queryClient.invalidateQueries({ queryKey: ["moderator-profile"] });
      toast({ title: "Đã cập nhật hồ sơ quản lý!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteModeratorProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("moderator_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderators"] });
      queryClient.invalidateQueries({ queryKey: ["all-moderators"] });
      toast({ title: "Đã xóa hồ sơ quản lý!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
