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
    
    console.log('Verifying payment for order:', orderId);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment with Cashfree API - PRODUCTION MODE
    const cashfreeUrl = `https://api.cashfree.com/pg/orders/${orderId}`;
    
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

    // Update order payment status in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isPaid = cashfreeData.order_status === 'PAID';
    
    // Extract customer phone from Cashfree response
    const customerPhone = cashfreeData.customer_details?.customer_phone || null;
    console.log('Customer phone from Cashfree:', customerPhone);
    
    const { data: orderData, error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: isPaid ? 'paid' : cashfreeData.order_status.toLowerCase(),
        customer_phone: customerPhone,
      })
      .eq('id', orderId)
      .select('canteen_id')
      .single();

    if (updateError) {
      console.error('Error updating order payment status:', updateError);
    }

    // Send email notification to vendor when payment is successful
    if (isPaid && orderData?.canteen_id) {
      console.log('New order placed - sending email to vendor');
      try {
        const vendorEmailResponse = await fetch(`${supabaseUrl}/functions/v1/send-vendor-order-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            canteen_id: orderData.canteen_id,
          }),
        });
        
        const vendorEmailResult = await vendorEmailResponse.json();
        console.log('Vendor email notification result:', vendorEmailResult);
      } catch (emailError) {
        console.error('Error sending vendor email notification:', emailError);
        // Don't fail the payment verification if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: isPaid,
        orderStatus: cashfreeData.order_status,
        paymentStatus: isPaid ? 'paid' : cashfreeData.order_status.toLowerCase(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
