import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is super_admin using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Permission denied. Super Admin only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Super admin verified, generating backup...");

    // Define tables to backup
    const tables = [
      "profiles",
      "user_roles",
      "transactions",
      "messages",
      "deposits",
      "withdrawals",
      "linked_bank_accounts",
      "kyc_submissions",
      "announcements",
      "platform_settings",
      "admin_action_logs",
      "admin_secrets",
      "risk_alerts",
      "moderator_profiles",
      "marketplace_posts",
      "post_comments",
      "post_reactions",
      "private_messages",
      "conversations",
      "transaction_logs",
    ];

    let sqlContent = `-- GDTG Database Backup\n`;
    sqlContent += `-- Generated at: ${new Date().toISOString()}\n`;
    sqlContent += `-- Super Admin: ${user.email}\n`;
    sqlContent += `-- ========================================\n\n`;

    // Fetch data from each table
    for (const tableName of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select("*");

        if (error) {
          sqlContent += `-- Error fetching ${tableName}: ${error.message}\n\n`;
          continue;
        }

        if (!data || data.length === 0) {
          sqlContent += `-- Table ${tableName}: empty\n\n`;
          continue;
        }

        sqlContent += `-- ========================================\n`;
        sqlContent += `-- Table: ${tableName}\n`;
        sqlContent += `-- Records: ${data.length}\n`;
        sqlContent += `-- ========================================\n\n`;

        // Generate INSERT statements
        for (const row of data) {
          const columns = Object.keys(row);
          const values = columns.map((col) => {
            const value = row[col];
            if (value === null) return "NULL";
            if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
            if (typeof value === "number") return value.toString();
            if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
            if (Array.isArray(value)) return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(", ")}]`;
            // String - escape single quotes
            return `'${String(value).replace(/'/g, "''")}'`;
          });

          sqlContent += `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;\n`;
        }

        sqlContent += `\n`;
      } catch (tableError) {
        sqlContent += `-- Error processing ${tableName}: ${tableError}\n\n`;
      }
    }

    sqlContent += `-- ========================================\n`;
    sqlContent += `-- Backup completed successfully\n`;
    sqlContent += `-- ========================================\n`;

    console.log("Backup generated successfully, length:", sqlContent.length);

    return new Response(sqlContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="gdtg_backup_${new Date().toISOString().split("T")[0]}.sql"`,
      },
    });
  } catch (error: unknown) {
    console.error("Backup error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
