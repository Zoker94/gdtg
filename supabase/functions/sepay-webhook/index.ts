import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload from SePay
    const payload = await req.json();
    console.log("SePay webhook received:", JSON.stringify(payload));

    // SePay webhook payload structure:
    // {
    //   "id": 123456,
    //   "gateway": "MBBank",
    //   "transactionDate": "2024-01-01 12:00:00",
    //   "accountNumber": "0123456789",
    //   "code": null,
    //   "content": "NAP123456",
    //   "transferType": "in",
    //   "transferAmount": 100000,
    //   "accumulated": 500000,
    //   "subAccount": null,
    //   "referenceCode": "FT123456",
    //   "description": "MBVCB.123456.NAP123456.CT tu 0987654321..."
    // }

    const {
      transferAmount,
      content,
      transferType,
      referenceCode,
      id: sepayTransactionId,
    } = payload;

    // Only process incoming transfers
    if (transferType !== "in") {
      console.log("Skipping outgoing transfer");
      return new Response(JSON.stringify({ success: true, message: "Skipped outgoing transfer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract deposit ID from content
    // Format supported:
    // - NAP{8-hex}  (new short format, e.g. NAP941397C5)
    // - NAP{uuid}   (legacy full UUID)
    let depositId: string | null = null;

    // Pattern 1: NAP followed by 8 hex chars (short format)
    const napShortMatch = content?.match(/NAP([A-F0-9]{8})/i);
    if (napShortMatch) {
      const shortId = napShortMatch[1].toLowerCase();
      console.log("Found short deposit ID prefix:", shortId);

      // NOTE: `like/ilike` filters don't work reliably on UUID columns in PostgREST,
      // so we fetch recent pending deposits and match prefix in JS.
      const { data: candidates, error: candidatesError } = await supabase
        .from("deposits")
        .select("id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200);

      if (candidatesError) {
        console.log("Error loading deposit candidates:", candidatesError);
      }

      const matched = candidates?.find((d) => d.id.toLowerCase().startsWith(shortId));
      if (matched) {
        depositId = matched.id;
      }
    }

    // Pattern 2: NAP followed by full UUID (legacy support)
    if (!depositId) {
      const napFullMatch = content?.match(/NAP([a-f0-9-]{36})/i);
      if (napFullMatch) {
        depositId = napFullMatch[1];
      }
    }

    if (!depositId) {
      console.log("No valid deposit ID found in content:", content);
      return new Response(JSON.stringify({ success: true, message: "No deposit ID found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing deposit:", depositId, "Amount:", transferAmount);

    // Find the pending deposit
    const { data: deposit, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .eq("id", depositId)
      .eq("status", "pending")
      .single();

    if (depositError || !deposit) {
      console.log("Deposit not found or already processed:", depositId, depositError);
      return new Response(JSON.stringify({ success: true, message: "Deposit not found or already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify amount matches (allow small difference for transfer fees)
    const amountDiff = Math.abs(deposit.amount - transferAmount);
    if (amountDiff > 1000) { // Allow 1000 VND difference
      console.log("Amount mismatch:", deposit.amount, "vs", transferAmount);
      // Still update but log the discrepancy
    }

    // Fallback: do direct updates but DO NOT write transaction_ref strings (FT.../DEP...)
    // because PostgREST is currently throwing UUID cast errors when those are present.
    // Goal: ensure money is credited and deposit is marked completed.
    const { error: updateDepositError } = await supabase
      .from("deposits")
      .update({
        status: "completed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", depositId)
      .eq("status", "pending");

    if (updateDepositError) {
      console.error("Error updating deposit:", updateDepositError);
      throw updateDepositError;
    }

    const { data: profileBefore, error: profileBeforeError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", deposit.user_id)
      .single();

    if (profileBeforeError) {
      console.error("Error fetching profile before credit:", profileBeforeError);
      throw profileBeforeError;
    }

    const newBalance = Number(profileBefore?.balance || 0) + Number(transferAmount);

    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", deposit.user_id);

    if (updateProfileError) {
      console.error("Error updating profile balance:", updateProfileError);
      throw updateProfileError;
    }

    console.log("Deposit confirmed successfully:", depositId, "New balance:", newBalance);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Deposit confirmed",
        depositId,
        amount: transferAmount,
        newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
