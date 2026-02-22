import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyPaymentRequest {
  orderId: string;
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

    const { orderId }: VerifyPaymentRequest = await req.json();
    
    console.log('Verifying shop payment for order:', orderId);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment with Cashfree API - PRODUCTION MODE
    // Shop orders have 'shop_' prefix in Cashfree
    const cashfreeOrderId = `shop_${orderId}`;
    const cashfreeUrl = `https://api.cashfree.com/pg/orders/${cashfreeOrderId}`;
    
    const cashfreeResponse = await fetch(cashfreeUrl, {
      method: 'GET',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
    });

    const cashfreeData = await cashfreeResponse.json();
    console.log('Cashfree verification response:', JSON.stringify(cashfreeData));

    if (!cashfreeResponse.ok) {
      console.error('Cashfree API error:', cashfreeData);
      return new Response(
        JSON.stringify({ error: cashfreeData.message || 'Failed to verify payment' }),
        { status: cashfreeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update shop order payment status in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isPaid = cashfreeData.order_status === 'PAID';
    
    const { data: orderData, error: updateError } = await supabase
      .from('shop_orders')
      .update({ 
        payment_status: isPaid ? 'paid' : cashfreeData.order_status.toLowerCase(),
        // Keep status as 'pending' for vendor to process (matches canteen flow)
        status: 'pending',
      })
      .eq('id', orderId)
      .select('shop_id, customer_name, pickup_code')
      .single();

    if (updateError) {
      console.error('Error updating shop order payment status:', updateError);
    }

    // Send email notification to shop owner when payment is successful
    if (isPaid && orderData?.shop_id) {
      console.log('Shop order paid - sending notification to shop owner');
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-shop-vendor-order-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            shop_id: orderData.shop_id,
          }),
        });
        const emailResult = await emailResponse.json();
        console.log('Shop vendor email notification result:', emailResult);
      } catch (emailError) {
        console.error('Failed to send shop vendor email notification:', emailError);
        // Don't fail the payment verification if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: isPaid,
        orderStatus: cashfreeData.order_status,
        paymentStatus: isPaid ? 'paid' : cashfreeData.order_status.toLowerCase(),
        pickupCode: isPaid ? orderData?.pickup_code : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying shop payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
