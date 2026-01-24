import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

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
  const queryClient = useQueryClient();

  // Realtime subscription for transactions
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-transactions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          // Check if this transaction involves the current user
          const newData = payload.new as Transaction;
          const oldData = payload.old as Transaction;
          
          if (
            newData?.buyer_id === user.id ||
            newData?.seller_id === user.id ||
            oldData?.buyer_id === user.id ||
            oldData?.seller_id === user.id
          ) {
            queryClient.invalidateQueries({ queryKey: ["transactions", user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

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
  const queryClient = useQueryClient();

  // Realtime subscription for single transaction
  useEffect(() => {
    if (!transactionId || !user?.id) return;

    const channel = supabase
      .channel(`transaction-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["transaction", transactionId] });
          
          // Show toast for important updates
          const newData = payload.new as Transaction;
          const oldData = payload.old as Transaction;
          
          if (payload.eventType === "UPDATE") {
            // Someone joined the room
            if (newData.buyer_id && !oldData?.buyer_id) {
              toast({ 
                title: "🎉 Người mua đã vào phòng!", 
                description: "Phòng giao dịch đã có đủ 2 bên" 
              });
            } else if (newData.seller_id && !oldData?.seller_id) {
              toast({ 
                title: "🎉 Người bán đã vào phòng!", 
                description: "Phòng giao dịch đã có đủ 2 bên" 
              });
            }
            
            // Confirmations
            if (newData.buyer_confirmed && !oldData?.buyer_confirmed) {
              toast({ 
                title: "✅ Người mua đã xác nhận!", 
                description: "Người mua xác nhận tham gia giao dịch" 
              });
            }
            if (newData.seller_confirmed && !oldData?.seller_confirmed) {
              toast({ 
                title: "✅ Người bán đã xác nhận!", 
                description: "Người bán xác nhận sẵn sàng giao hàng" 
              });
            }
            
            // Status changes
            if (newData.status !== oldData?.status) {
              switch (newData.status) {
                case "deposited":
                  toast({ 
                    title: "💰 Đã đặt cọc!", 
                    description: "Người mua đã thanh toán vào hệ thống" 
                  });
                  break;
                case "shipping":
                  toast({ 
                    title: "🚚 Đang giao hàng!", 
                    description: "Người bán đã gửi hàng" 
                  });
                  break;
                case "completed":
                  toast({ 
                    title: "🎊 Giao dịch hoàn tất!", 
                    description: "Tiền đã được giải ngân cho người bán" 
                  });
                  break;
                case "disputed":
                  toast({ 
                    title: "⚠️ Có khiếu nại!", 
                    description: "Giao dịch đang chờ Admin xử lý",
                    variant: "destructive"
                  });
                  break;
                case "refunded":
                  toast({ 
                    title: "↩️ Đã hoàn tiền!", 
                    description: "Tiền đã được hoàn lại cho người mua" 
                  });
                  break;
                case "cancelled":
                  toast({ 
                    title: "❌ Giao dịch đã hủy", 
                    variant: "destructive"
                  });
                  break;
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, user?.id, queryClient]);

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
