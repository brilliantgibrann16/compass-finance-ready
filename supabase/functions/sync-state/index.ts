import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a Supabase client configured to run on behalf of the user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const changes = body.changes || [];

    if (!Array.isArray(changes)) {
      return new Response(JSON.stringify({ error: "Invalid changes format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRecord, error: userError } = await supabase.auth.getUser();
    if (userError || !userRecord?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accepted = 0;
    let rejected = 0;
    const rejectedIds: string[] = [];

    // Process batch
    for (const change of changes) {
      try {
        const slice_id = change.payload?.id; // e.g. 'balance', 'transactions'
        if (!slice_id) {
          rejected++;
          rejectedIds.push(change.id);
          continue;
        }

        // Upsert directly into sync_state
        const { error: upsertError } = await supabase
          .from("sync_state")
          .upsert({
            user_id: userRecord.user.id,
            slice_id,
            data: change.payload,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id, slice_id"
          });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          rejected++;
          rejectedIds.push(change.id);
        } else {
          accepted++;
        }
      } catch (err) {
        console.error("Processing error:", err);
        rejected++;
        rejectedIds.push(change.id);
      }
    }

    return new Response(JSON.stringify({
      accepted,
      rejected,
      rejectedIds: rejectedIds.length > 0 ? rejectedIds : undefined,
      serverTime: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
