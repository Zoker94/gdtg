import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PopupSettings {
  enabled: boolean;
  title: string;
  content: string;
}

export const usePopupAnnouncement = () => {
  return useQuery({
    queryKey: ["popup-announcement"],
    queryFn: async (): Promise<PopupSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["popup_enabled", "popup_title", "popup_content"]);

      if (error) throw error;

      const settings: PopupSettings = {
        enabled: false,
        title: "Thông báo quan trọng",
        content: "",
      };

      data?.forEach((item) => {
        if (item.setting_key === "popup_enabled") {
          settings.enabled = item.setting_value === "true";
        } else if (item.setting_key === "popup_title") {
          settings.title = item.setting_value;
        } else if (item.setting_key === "popup_content") {
          settings.content = item.setting_value;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useUpdatePopupAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: PopupSettings) => {
      const updates = [
        { setting_key: "popup_enabled", setting_value: settings.enabled.toString() },
        { setting_key: "popup_title", setting_value: settings.title },
        { setting_key: "popup_content", setting_value: settings.content },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ setting_value: update.setting_value })
          .eq("setting_key", update.setting_key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popup-announcement"] });
      toast({ title: "Đã cập nhật thông báo pop-up!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
