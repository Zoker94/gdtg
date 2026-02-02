import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useMaintenanceMode = () => {
  const { user } = useAuth();

  // Check if maintenance mode is enabled
  const { data: isMaintenanceMode, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["maintenance-mode-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "maintenance_mode")
        .maybeSingle();
      
      if (error) return false;
      return data?.setting_value === "true";
    },
    staleTime: 1000 * 30, // Check every 30 seconds
    refetchInterval: 1000 * 30,
  });

  // Check if current user is super_admin
  const { data: isSuperAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });

  const isLoading = maintenanceLoading || roleLoading;
  
  // Show maintenance page if:
  // 1. Maintenance mode is ON
  // 2. User is NOT a super_admin (or not logged in)
  const shouldShowMaintenance = isMaintenanceMode && !isSuperAdmin;

  return {
    isMaintenanceMode,
    isSuperAdmin,
    shouldShowMaintenance,
    isLoading,
  };
};
