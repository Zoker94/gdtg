import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AdminActionLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  action_type: string;
  details: Json | null;
  note: string | null;
  created_at: string;
  // Joined data
  admin_name?: string;
  target_user_name?: string;
}

export const useAdminActionLogs = (limit = 50) => {
  return useQuery({
    queryKey: ["admin-action-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch admin and target user names
      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map((log) => log.admin_id))];
        const targetIds = [...new Set(data.map((log) => log.target_user_id))];
        const allUserIds = [...new Set([...adminIds, ...targetIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allUserIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p.full_name]) || []
        );

        return data.map((log) => ({
          ...log,
          admin_name: profileMap.get(log.admin_id) || "Admin",
          target_user_name: profileMap.get(log.target_user_id) || "Người dùng",
        })) as AdminActionLog[];
      }

      return data as AdminActionLog[];
    },
  });
};

export const useLogAdminAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      actionType,
      details,
      note,
    }: {
      targetUserId: string;
      actionType: string;
      details?: Record<string, unknown>;
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if current user is super_admin - if so, skip logging (Log Eraser feature)
      const { data: superAdminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (superAdminCheck) {
        // Super Admin - don't log their actions
        return;
      }

      const { error } = await supabase.from("admin_action_logs").insert([{
        admin_id: user.id,
        target_user_id: targetUserId,
        action_type: actionType,
        details: (details || {}) as Json,
        note: note || null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-action-logs"] });
    },
  });
};
