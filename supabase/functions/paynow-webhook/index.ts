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

    if (!orderId || !paynowRef || !incomingHash) {
      return new Response("Missing transaction metadata parameters", { status: 400 });
    }

    // 3. Cryptographic Signature Validation (fail closed: never process unsigned updates)
    const integrationId = Deno.env.get('PAYNOW_INTEGRATION_ID') || '';
    const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY') || '';

    if (!integrationId || !integrationKey) {
      console.error("PAYNOW_INTEGRATION_ID / PAYNOW_INTEGRATION_KEY not set: rejecting webhook.");
      return new Response("Server configuration error", { status: 500 });
    }

    try {
      const paynow = new Paynow(integrationId, integrationKey);
      const paramObj: Record<string, string> = {};
      params.forEach((value, key) => {
        paramObj[key] = value;
      });

      if (!paynow.verifyHash(paramObj)) {
        console.error(`🚨 Security Violation: Invalid Paynow hash signature for order ${orderId}`);
        return new Response("Invalid transaction signature", { status: 403 });
      }
    } catch (verifyErr) {
      console.error("Signature verification error:", verifyErr);
      return new Response("Signature verification failed", { status: 403 });
    }

    // 4. Only settled statuses fulfill the order; everything else is acknowledged
    const settledStatuses = ['paid', 'awaiting delivery', 'delivered'];
    if (!settledStatuses.includes((status || '').toLowerCase())) {
      return new Response("Status acknowledged", { status: 200 });
    }

    // 5. Amount actually paid, as signed by Paynow (decimal string, e.g. "106.06")
    const amountRaw = params.get('amount') || '';
    if (!/^\d+(\.\d{1,2})?$/.test(amountRaw.trim())) {
      console.error(`Webhook for order ${orderId} has an invalid amount: "${amountRaw}"`);
      return new Response("Invalid amount", { status: 400 });
    }
    const paidAmountCents = Math.round(parseFloat(amountRaw) * 100);

    // 6. Instantiate Supabase Admin Client using secure environment secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
      return new Response("Server configuration error", { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // 7. Fire atomic stored procedure: verifies the amount, then locks funds in escrow.
    //    Idempotent for orders that are already paid (Paynow retries notifications).
    const { error } = await supabaseAdmin.rpc('fulfill_marketplace_order', {
      target_order_id: orderId,
      gateway_ref: paynowRef,
      paid_amount_cents: paidAmountCents
    });

    if (error) {
      console.error(`Database ledger execution error for order ${orderId}:`, error.message);
      if (/amount mismatch|cannot fulfill|no payable total/i.test(error.message)) {
        // Permanent rejection: acknowledge so Paynow stops retrying; needs manual review.
        return new Response("Order rejected: requires manual review", { status: 409 });
      }
      return new Response("Internal Database Error Processing Order", { status: 500 });
    }

    console.log(`✅ Order ${orderId} successfully processed and secured in escrow.`);
    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("Critical webhook intercept error:", err);
    return new Response("Server error reading payload", { status: 500 });
  }
});