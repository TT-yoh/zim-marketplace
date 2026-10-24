import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0"
import { Paynow } from "npm:paynow@2.2.2"

serve(async (req) => {
  // 1. Reject any non-POST methods
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 2. Paynow sends webhooks as application/x-www-form-urlencoded
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const orderId = params.get('reference');
    const status = params.get('status');
    const paynowRef = params.get('paynowreference');
    const incomingHash = params.get('hash');

    if (!orderId || !paynowRef) {
      return new Response("Missing transaction metadata parameters", { status: 400 });
    }

    // 3. Cryptographic Signature Validation
    const integrationId = Deno.env.get('PAYNOW_INTEGRATION_ID') || '';
    const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY') || '';

    if (integrationId && integrationKey) {
      try {
        const paynow = new Paynow(integrationId, integrationKey);
        // Convert URLSearchParams to dictionary for verification
        const paramObj: Record<string, string> = {};
        params.forEach((value, key) => {
          paramObj[key] = value;
        });

        const isSignatureValid = paynow.verifyHash(paramObj);
        if (!isSignatureValid) {
          console.error(`🚨 Security Violation: Invalid Paynow hash signature for order ${orderId}`);
          return new Response("Invalid transaction signature", { status: 403 });
        }
      } catch (verifyErr) {
        console.error("Signature verification error:", verifyErr);
        return new Response("Signature verification failed", { status: 403 });
      }
    } else {
      console.warn("⚠️ Warning: PAYNOW_INTEGRATION_KEY not set. Webhook processed in bypass mode.");
    }

    // 4. If the payment isn't fully settled yet, acknowledge and stop
    if (status?.toLowerCase() !== 'paid') {
      return new Response("Status acknowledged", { status: 200 });
    }

    // 5. Instantiate Supabase Admin Client using secure environment secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
      return new Response("Server configuration error", { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // 6. Fire atomic stored procedure to fulfill order and lock funds in escrow
    const { error } = await supabaseAdmin.rpc('fulfill_marketplace_order', {
      target_order_id: orderId,
      gateway_ref: paynowRef
    });

    if (error) {
      console.error(`Database ledger execution error for order ${orderId}:`, error.message);
      return new Response("Internal Database Error Processing Order", { status: 500 });
    }

    console.log(`✅ Order ${orderId} successfully processed and secured in escrow.`);
    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("Critical webhook intercept error:", err);
    return new Response("Server error reading payload", { status: 500 });
  }
});