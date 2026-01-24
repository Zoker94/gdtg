import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find transactions that are pending and older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Get stale pending transactions (both buyer and seller not joined yet, or not deposited)
    const { data: staleTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("id, room_id, status, created_at")
      .in("status", ["pending"])
      .lt("created_at", thirtyMinutesAgo);

    if (fetchError) {
      throw fetchError;
    }

    if (!staleTransactions || staleTransactions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale transactions found", cancelled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel all stale transactions
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ 
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .in("id", staleTransactions.map(t => t.id));

    if (updateError) {
      throw updateError;
    }

    console.log(`Cancelled ${staleTransactions.length} stale transactions`);

    return new Response(
      JSON.stringify({ 
        message: "Stale transactions cancelled", 
        cancelled: staleTransactions.length,
        transactions: staleTransactions.map(t => ({ id: t.id, room_id: t.room_id }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error cancelling stale transactions:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
