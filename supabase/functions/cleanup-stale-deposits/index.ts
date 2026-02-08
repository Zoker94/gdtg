import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff time (15 minutes ago)
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    console.log("Cleaning up stale deposits older than:", cutoffTime);

    // Delete pending deposits older than 15 minutes
    const { data: deletedDeposits, error: deleteError } = await supabase
      .from("deposits")
      .delete()
      .eq("status", "pending")
      .lt("created_at", cutoffTime)
      .select("id, user_id, amount, created_at");

    if (deleteError) {
      console.error("Error deleting stale deposits:", deleteError);
      throw deleteError;
    }

    const deletedCount = deletedDeposits?.length || 0;
    console.log(`Deleted ${deletedCount} stale pending deposits`);

    if (deletedDeposits && deletedDeposits.length > 0) {
      console.log("Deleted deposits:", JSON.stringify(deletedDeposits));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${deletedCount} stale deposits`,
        deleted: deletedDeposits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Cleanup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
