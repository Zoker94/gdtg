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

    // Extract deposit ID from content (format: NAP{deposit_id} or GDTG{deposit_id})
    // Try multiple patterns
    let depositId: string | null = null;
    
    // Pattern 1: NAP followed by UUID
    const napMatch = content?.match(/NAP([a-f0-9-]{36})/i);
    if (napMatch) {
      depositId = napMatch[1];
    }
    
    // Pattern 2: GDTG followed by UUID
    const gdtgMatch = content?.match(/GDTG([a-f0-9-]{36})/i);
    if (gdtgMatch) {
      depositId = gdtgMatch[1];
    }

    // Pattern 3: Just UUID in content
    const uuidMatch = content?.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (!depositId && uuidMatch) {
      depositId = uuidMatch[1];
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

    // Update deposit status to completed
    const { error: updateDepositError } = await supabase
      .from("deposits")
      .update({
        status: "completed",
        confirmed_at: new Date().toISOString(),
        transaction_ref: referenceCode || String(sepayTransactionId),
        admin_note: `Tự động xác nhận qua SePay. Số tiền thực nhận: ${transferAmount.toLocaleString()}đ`,
      })
      .eq("id", depositId);

    if (updateDepositError) {
      console.error("Error updating deposit:", updateDepositError);
      throw updateDepositError;
    }

    // Add balance to user profile
    const { error: updateBalanceError } = await supabase
      .from("profiles")
      .update({
        balance: supabase.rpc("", {}), // We need to use raw SQL for increment
      })
      .eq("user_id", deposit.user_id);

    // Use raw update with increment
    const { error: balanceError } = await supabase.rpc("confirm_deposit_auto", {
      p_deposit_id: depositId,
      p_amount: transferAmount,
    });

    // Fallback: direct balance update if RPC doesn't exist
    if (balanceError) {
      console.log("RPC not available, using direct update");
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", deposit.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: profile.balance + transferAmount })
          .eq("user_id", deposit.user_id);
      }
    }

    console.log("Deposit confirmed successfully:", depositId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Deposit confirmed",
        depositId,
        amount: transferAmount,
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
