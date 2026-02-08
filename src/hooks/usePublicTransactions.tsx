import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTransaction {
  id: string;
  product_name: string;
  amount: number;
  status: string;
  category: string | null;
  created_at: string;
  buyer_name: string | null;
  seller_name: string | null;
}

// Anonymize name: "Nguyen Van A" -> "Ng***n"
const anonymizeName = (name: string | null): string => {
  if (!name || name.length < 2) return "***";
  
  // Get first word
  const firstName = name.split(" ")[0];
  if (firstName.length <= 2) return firstName[0] + "***";
  
  return firstName.slice(0, 2) + "***" + firstName.slice(-1);
};

export const usePublicTransactions = (limit = 10) => {
  return useQuery({
    queryKey: ["public-transactions", limit],
    queryFn: async () => {
      // Get recent active transactions (deposited, shipping, or recently completed)
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          product_name,
          amount,
          status,
          category,
          created_at,
          buyer_id,
          seller_id
        `)
        .in("status", ["deposited", "shipping", "completed"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get profiles for participants
      const userIds = new Set<string>();
      data.forEach((t) => {
        if (t.buyer_id) userIds.add(t.buyer_id);
        if (t.seller_id) userIds.add(t.seller_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]));

      // Map and anonymize
      return data.map((t) => ({
        id: t.id,
        product_name: t.product_name,
        amount: t.amount,
        status: t.status,
        category: t.category,
        created_at: t.created_at,
        buyer_name: anonymizeName(profileMap.get(t.buyer_id!) || null),
        seller_name: anonymizeName(profileMap.get(t.seller_id!) || null),
      })) as PublicTransaction[];
    },
    refetchInterval: 30000, // Auto refresh every 30s
    staleTime: 15000,
  });
};
