import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface LinkedBankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useLinkedBanks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["linked-banks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("linked_bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as LinkedBankAccount[];
    },
    enabled: !!user?.id,
  });
};

export const useAddLinkedBank = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bankData: {
      bank_name: string;
      bank_account_number: string;
      bank_account_name: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("linked_bank_accounts")
        .insert({
          user_id: user.id,
          ...bankData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked-banks"] });
      toast({ title: "Đã thêm tài khoản ngân hàng thành công!" });
    },
    onError: (error: Error) => {
      if (error.message.includes("tối đa 2 ngân hàng")) {
        toast({ 
          title: "Lỗi", 
          description: "Bạn chỉ được đăng ký tối đa 2 tài khoản ngân hàng", 
          variant: "destructive" 
        });
      } else if (error.message.includes("duplicate")) {
        toast({ 
          title: "Lỗi", 
          description: "Số tài khoản này đã được đăng ký", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Lỗi", description: error.message, variant: "destructive" });
      }
    },
  });
};

export const useDeleteLinkedBank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankId: string) => {
      const { error } = await supabase
        .from("linked_bank_accounts")
        .delete()
        .eq("id", bankId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked-banks"] });
      toast({ title: "Đã xóa tài khoản ngân hàng!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
};
