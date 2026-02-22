import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateOrderRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID');
    const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY');
    
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error('Missing Cashfree credentials');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, amount, customerName, customerEmail, customerPhone, returnUrl }: CreateOrderRequest = await req.json();
    
    console.log('Creating Cashfree order:', { orderId, amount, customerName, customerEmail });

    // Validate required fields
    if (!orderId || !amount || !customerName || !customerEmail || !customerPhone || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order with Cashfree API - PRODUCTION MODE
    const cashfreeUrl = 'https://api.cashfree.com/pg/orders';
    
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: orderId.split('_')[0], // Use part of order ID as customer ID
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: returnUrl,
      },
    };

    console.log('Cashfree request payload:', JSON.stringify(orderPayload));

    const cashfreeResponse = await fetch(cashfreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(orderPayload),
    });

    const cashfreeData = await cashfreeResponse.json();
    console.log('Cashfree response:', JSON.stringify(cashfreeData));

    if (!cashfreeResponse.ok) {
      console.error('Cashfree API error:', cashfreeData);
      return new Response(
        JSON.stringify({ error: cashfreeData.message || 'Failed to create payment order' }),
        { status: cashfreeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order with payment_id in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_id: cashfreeData.cf_order_id,
        payment_session_id: cashfreeData.payment_session_id,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order with payment info:', updateError);
    }

    return new Response(
      JSON.stringify({
        paymentSessionId: cashfreeData.payment_session_id,
        cfOrderId: cashfreeData.cf_order_id,
        orderStatus: cashfreeData.order_status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
