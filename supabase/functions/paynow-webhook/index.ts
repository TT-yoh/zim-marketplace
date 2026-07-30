import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0"

serve(async (req) => {
  // 1. Reject any standard browser requests or wrong methods
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 2. Paynow sends webhooks as application/x-www-form-urlencoded format
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const orderId = params.get('reference');         // Maps to your target_order_id
    const status = params.get('status');            // 'Paid', 'Sent', or 'Awaiting Delivery'
    const paynowRef = params.get('paynowreference'); // The local transaction tracking ID

    // If the payment isn't fully settled yet, stop execution and tell Paynow we acknowledged the pulse
    if (status?.toLowerCase() !== 'paid') {
      return new Response("Status ignored", { status: 200 });
    }

    if (!orderId || !paynowRef) {
      return new Response("Missing transaction metadata parameters", { status: 400 });
    }

    // 3. Instantiate Supabase Admin Client using environment variables
    // We use the Service Role Key because webhooks run autonomously and must bypass Row Level Security (RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'https://qelpgmrbohsdkwvcsnov.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbHBnbXJib2hzZGt3dmNzbm92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTAxMDgxMywiZXhwIjoyMDk2NTg2ODEzfQ.CFS1gQDkTSwH5t9_-fvrnUO8DAotv_hykwZ0wZ_4Uyg',
      { auth: { persistSession: false } }
    );

    // 4. Fire our atomic PostgreSQL function to settle the transaction and ledger splits
    const { error } = await supabaseAdmin.rpc('fulfill_marketplace_order', {
      target_order_id: orderId,
      gateway_ref: paynowRef
    });

    if (error) {
      console.error(`Database ledger execution error for order ${orderId}:`, error.message);
      return new Response("Internal Database Error Processing Split", { status: 500 });
    }

    console.log(`✅ Order ${orderId} successfully processed. Ledgers updated.`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Critical webhook intercept crash:", err);
    return new Response("Server error reading payload", { status: 500 });
  }
})