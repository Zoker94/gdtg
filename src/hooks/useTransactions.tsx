import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export type TransactionStatus = "pending" | "deposited" | "shipping" | "completed" | "disputed" | "cancelled" | "refunded";
export type FeeBearer = "buyer" | "seller" | "split";

export interface Transaction {
  id: string;
  transaction_code: string;
  room_id: string | null;
  room_password: string | null;
  invite_link: string | null;
  category: string | null;
  images: string[] | null;
  buyer_id: string | null;
  seller_id: string | null;
  product_name: string;
  product_description: string | null;
  amount: number;
  platform_fee_percent: number;
  platform_fee_amount: number;
  seller_receives: number;
  fee_bearer: FeeBearer;
  status: TransactionStatus;
  dispute_time_hours: number;
  dispute_reason: string | null;
  dispute_at: string | null;
  deposited_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  product_name: string;
  product_description?: string;
  category?: string;
  images?: string[];
  amount: number;
  platform_fee_percent: number;
  fee_bearer: FeeBearer;
  dispute_time_hours: number;
  buyer_id?: string;
  seller_id?: string;
}

export const useTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user?.id,
  });
};

export const useTransaction = (transactionId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: async () => {
      if (!transactionId || !user?.id) return null;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .maybeSingle();

      if (error) throw error;
      return data as Transaction | null;
    },
    enabled: !!transactionId && !!user?.id,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const insertData = {
        product_name: input.product_name,
        product_description: input.product_description || null,
        category: input.category || "other",
        images: input.images || [],
        amount: input.amount,
        platform_fee_percent: input.platform_fee_percent,
        fee_bearer: input.fee_bearer,
        dispute_time_hours: input.dispute_time_hours,
        buyer_id: input.buyer_id || null,
        seller_id: input.seller_id || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("transactions")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Thành công",
        description: "Đã tạo phòng giao dịch",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTransactionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      status,
      additionalData,
    }: {
      transactionId: string;
      status: TransactionStatus;
      additionalData?: Partial<Transaction>;
    }) => {
      const updateData: Record<string, unknown> = { status, ...additionalData };

      // Add timestamps based on status
      if (status === "deposited") {
        updateData.deposited_at = new Date().toISOString();
      } else if (status === "shipping") {
        updateData.shipped_at = new Date().toISOString();
      } else if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (status === "disputed") {
        updateData.dispute_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId)
        .select()
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction", data.id] });
      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái giao dịch đã được cập nhật",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useConfirmTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      role,
    }: {
      transactionId: string;
      role: "buyer" | "seller";
    }) => {
      const updateData: Record<string, unknown> = {};
      
      if (role === "buyer") {
        updateData.buyer_confirmed = true;
      } else {
        updateData.seller_confirmed = true;
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId)
        .select()
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction", data.id] });
      toast({
        title: "Đã xác nhận!",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Admin hook for all transactions
export const useAllTransactions = () => {
  return useQuery({
    queryKey: ["all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });
};
