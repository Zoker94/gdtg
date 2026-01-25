import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export interface KycSubmission {
  id: string;
  user_id: string;
  front_image_url: string;
  back_image_url: string;
  full_name: string;
  id_number: string;
  date_of_birth: string | null;
  status: KycStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useMyKycSubmission = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-kyc-submission", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as KycSubmission | null;
    },
    enabled: !!user?.id,
  });
};

export const useSubmitKyc = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      front_image_url: string;
      back_image_url: string;
      full_name: string;
      id_number: string;
      date_of_birth?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("kyc_submissions").upsert({
        user_id: user.id,
        ...data,
        status: "pending",
      });

      if (error) throw error;

      // Update profile kyc_status
      await supabase
        .from("profiles")
        .update({ kyc_status: "pending" })
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-kyc-submission"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Gửi KYC thành công", description: "Vui lòng chờ duyệt" });
    },
    onError: (error) => {
      toast({
        title: "Lỗi gửi KYC",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Admin/Moderator hooks
export const useAllKycSubmissions = () => {
  return useQuery({
    queryKey: ["all-kyc-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KycSubmission[];
    },
  });
};

export const useApproveKyc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase.rpc("approve_kyc", {
        p_submission_id: submissionId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-kyc-submissions"] });
      toast({ title: "Đã duyệt KYC thành công" });
    },
    onError: (error) => {
      toast({
        title: "Lỗi duyệt KYC",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRejectKyc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      reason,
    }: {
      submissionId: string;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("reject_kyc", {
        p_submission_id: submissionId,
        p_reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-kyc-submissions"] });
      toast({ title: "Đã từ chối KYC" });
    },
    onError: (error) => {
      toast({
        title: "Lỗi từ chối KYC",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
