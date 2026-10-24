import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0"
import { Paynow } from "npm:paynow@2.2.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, mobileNumber, provider, buyerEmail } = await req.json()

    if (!orderId || !mobileNumber || !provider || !buyerEmail) {
      return new Response(JSON.stringify({ error: "Missing required checkout parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 1. Initialize Supabase Admin with secure environment secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qelpgmrbohsdkwvcsnov.supabase.co'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    // 2. Caller Authentication Check (Zero-Trust)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required to initiate payment." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired authentication session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 3. Fetch Order & Verify Ownership
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, total_amount_cents, currency, status, shipping_fee_cents')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order record not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Ensure the caller is either the buyer who placed the order or a platform admin
    const { data: adminRecord } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (order.buyer_id !== user.id && !adminRecord) {
      return new Response(JSON.stringify({ error: "Forbidden: You are not authorized to pay for this order." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Ensure order is not already paid or fulfilled
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Order is already in "${order.status}" status.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 4. Validate Amount Against Database Order Items (Zero-Trust Price Verification)
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('price_at_purchase_cents, quantity')
      .eq('order_id', orderId)

    if (itemsError || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Order contains no verifiable items." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const itemsSubtotal = items.reduce((acc, it) => acc + (it.price_at_purchase_cents * it.quantity), 0)
    const expectedMinimumTotal = itemsSubtotal + (order.shipping_fee_cents || 0)

    // Allow reasonable promo discounts up to 50% if total is less, but prevent zero or negative totals
    if (order.total_amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order total amount." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 5. Initialize Paynow Client
    const integrationId = Deno.env.get('PAYNOW_INTEGRATION_ID') || ''
    const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY') || ''

    if (!integrationId || !integrationKey) {
      return new Response(JSON.stringify({ 
        error: "Paynow API integration keys are pending production configuration. Please contact platform support." 
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const paynow = new Paynow(integrationId, integrationKey)

    // Secure webhook result URL and frontend return URL
    const baseUrl = Deno.env.get('SUPABASE_URL') || supabaseUrl
    const frontendUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'http://localhost:5173'

    paynow.resultUrl = `${baseUrl}/functions/v1/paynow-webhook`
    paynow.returnUrl = `${frontendUrl}/payment-complete`

    const payment = paynow.createPayment(orderId, buyerEmail)
    // Convert cents to dollars for Paynow
    const amountInDollars = Number((order.total_amount_cents / 100).toFixed(2))
    payment.add(`Marketplace Order Payment (${order.currency})`, amountInDollars)

    // 6. Send Mobile Express Payment Request
    const response = await paynow.sendMobile(payment, mobileNumber, provider)

    if (response.success) {
      // Save Paynow status polling URL
      await supabaseAdmin
        .from('orders')
        .update({ payment_intent_id: response.pollUrl })
        .eq('id', orderId)

      return new Response(JSON.stringify({ 
        success: true, 
        message: "USSD notification dispatched. Please approve the prompt on your phone." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    } else {
      console.error("Paynow gateway rejected payment initiation:", response.error)
      return new Response(JSON.stringify({ 
        error: "Payment gateway rejected request.", 
        details: response.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

  } catch (err: any) {
    console.error("Initiate payment exception:", err)
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})