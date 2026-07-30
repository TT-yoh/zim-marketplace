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

    // 1. Initialize Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://qelpgmrbohsdkwvcsnov.supabase.co'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbHBnbXJib2hzZGt3dmNzbm92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTAxMDgxMywiZXhwIjoyMDk2NTg2ODEzfQ.CFS1gQDkTSwH5t9_-fvrnUO8DAotv_hykwZ0wZ_4Uyg'

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    )

    // 2. Fetch the actual total amount and currency from your database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('total_amount_cents, currency')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order record verification failed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 3. Initialize Paynow Client
    const integrationId = Deno.env.get('PAYNOW_INTEGRATION_ID') ?? ''
    const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY') ?? ''

    if (!integrationId || !integrationKey) {
      return new Response(JSON.stringify({ 
        error: "Paynow API keys are pending setup. Use 'Simulate Successful Test Payment' for local testing." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const paynow = new Paynow(integrationId, integrationKey)

    // Set the result URL to our previously deployed webhook endpoint
    paynow.resultUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/paynow-webhook`
    paynow.returnUrl = `http://localhost:5173/payment-complete` 

    const payment = paynow.createPayment(orderId, buyerEmail)
    payment.add(`Marketplace Order Payment`, order.total_amount_cents / 100)

    // 4. Send Mobile Express Payment Request
    const response = await paynow.sendMobile(payment, mobileNumber, provider)

    if (response.success) {
      // Save Paynow's unique status polling URL to the database
      await supabaseAdmin
        .from('orders')
        .update({ payment_intent_id: response.pollUrl, status: 'pending' })
        .eq('id', orderId)

      return new Response(JSON.stringify({ success: true, message: "USSD notification dispatched." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    } else {
      return new Response(JSON.stringify({ error: "Paynow Gateway rejected initiation", details: response.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})