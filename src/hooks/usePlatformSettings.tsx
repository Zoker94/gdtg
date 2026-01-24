import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlatformSettings {
  default_fee_percent: number;
  default_dispute_hours: number;
  min_transaction_amount: number;
}

export const usePlatformSettings = () => {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settings: PlatformSettings = {
        default_fee_percent: 5,
        default_dispute_hours: 24,
        min_transaction_amount: 10000,
      };

      data?.forEach((row) => {
        if (row.setting_key === "default_fee_percent") {
          settings.default_fee_percent = Number(row.setting_value);
        } else if (row.setting_key === "default_dispute_hours") {
          settings.default_dispute_hours = Number(row.setting_value);
        } else if (row.setting_key === "min_transaction_amount") {
          settings.min_transaction_amount = Number(row.setting_value);
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
