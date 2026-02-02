import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type KYCStatus = "none" | "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  balance: number;
  reputation_score: number;
  total_transactions: number;
  kyc_status: KYCStatus;
  is_banned: boolean;
  is_verified: boolean | null;
  ban_reason: string | null;
  warning_message: string | null;
  telegram_chat_id: string | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  suspicious_at: string | null;
  is_balance_frozen: boolean | null;
  balance_frozen_at: string | null;
  balance_freeze_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
};

// AppRole includes super_admin but it's hidden from UI - always displayed as "admin"
export type AppRole = "admin" | "moderator" | "user" | "super_admin";

export interface UserRoleInfo {
  roles: AppRole[];
  isAdmin: boolean;
  isModerator: boolean;
  isUser: boolean;
  isSuperAdmin: boolean; // Hidden - only used internally for role management access
}

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<UserRoleInfo> => {
      if (!user?.id) return { roles: [], isAdmin: false, isModerator: false, isUser: false, isSuperAdmin: false };

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      
      const roles = (data?.map((r) => r.role) || []) as AppRole[];
      const isSuperAdmin = roles.includes("super_admin");
      
      return {
        roles,
        // super_admin is treated as admin for all permission checks
        isAdmin: roles.includes("admin") || isSuperAdmin,
        isModerator: roles.includes("moderator"),
        isUser: roles.includes("user"),
        isSuperAdmin, // Only super_admin can manage roles
      };
    },
    // Only enable when auth is fully loaded and user exists
    enabled: !authLoading && !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Hook to check if user can manage roles (only super_admin)
export const useCanManageRoles = () => {
  const { data } = useUserRole();
  return { canManage: data?.isSuperAdmin || false };
};
