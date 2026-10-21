import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customer_phone, order_number, product_name } = await req.json()

    if (!customer_phone) {
      throw new Error("customer_phone missing")
    }

    const GATEWAY_ID = "6ad7a36560b1138230b02027"
    const API_KEY = Deno.env.get("TEXTBEE_API_KEY")
    const SIM_ID = 6

    // تنظيف الرقم
    let cleanPhone = customer_phone.trim()
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('0')) cleanPhone = '+967' + cleanPhone.substring(1)
      else cleanPhone = '+967' + cleanPhone
    }

    const message = `مرحبا، تم استلام طلبك #${order_number || ''} - ${product_name || 'من السوق الشامل'}. سنتواصل معك قريبا للتأكيد.`

    const res = await fetch(
      `https://api.textbee.dev/api/v1/gateway/${GATEWAY_ID}/send-sms`,
      {
        method: "POST",
        headers: { "x-api-key": API_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [cleanPhone],
          message: message,
          simId: 6
        })
      }
    )

    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
