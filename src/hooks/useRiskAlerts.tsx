import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface RiskAlert {
  id: string;
  user_id: string;
  alert_type: string;
  description: string;
  metadata: Json;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export const useRiskAlerts = () => {
  return useQuery({
    queryKey: ["risk-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RiskAlert[];
    },
  });
};

export const useResolveRiskAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, note }: { alertId: string; note?: string }) => {
      const { error } = await supabase
        .from("risk_alerts")
        .update({
          is_resolved: true,
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolved_at: new Date().toISOString(),
          resolution_note: note || null,
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });
      toast({ title: "Đã xử lý cảnh báo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteRiskAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("risk_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });
      toast({ title: "Đã xóa cảnh báo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
