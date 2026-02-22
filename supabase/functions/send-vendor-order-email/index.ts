import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VendorEmailPayload {
  order_id: string
  canteen_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Brevo API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: VendorEmailPayload = await req.json()
    const { order_id, canteen_id } = payload

    console.log(`New order placed - sending email to vendor for order: ${order_id}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get canteen details with vendor_id and vendor_email
    const { data: canteen, error: canteenError } = await supabase
      .from('canteens')
      .select('name, vendor_id, vendor_email')
      .eq('id', canteen_id)
      .single()

    if (canteenError || !canteen) {
      console.error('Failed to get canteen:', canteenError)
      return new Response(
        JSON.stringify({ success: false, error: 'Canteen not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if vendor_email is configured for this canteen
    if (!canteen.vendor_email) {
      console.error('Vendor email not configured for canteen:', canteen_id)
      return new Response(
        JSON.stringify({ success: false, error: 'Vendor email not configured for this canteen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get vendor profile for name
    const { data: vendorProfile, error: vendorError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', canteen.vendor_id)
      .single()

    if (vendorError) {
      console.error('Failed to get vendor profile:', vendorError)
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, user_id, created_at, pickup_code, platform_fee, pg_fee')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      console.error('Failed to get order:', orderError)
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', order.user_id)
      .single()

    if (customerError) {
      console.error('Failed to get customer profile:', customerError)
    }

    const customerName = customer?.name || 'Customer'

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('name, quantity, price')
      .eq('order_id', order_id)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
    }

    const items = orderItems || []
    // Calculate actual food total from item prices (not from order.total which includes fees)
    const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const vendorEmail = canteen.vendor_email
    const vendorName = vendorProfile?.name || 'Vendor'
    const canteenName = canteen.name || 'Your Canteen'

    // Generate order items HTML
    const orderItemsHtml = items.length > 0 ? `
      <div style="margin: 25px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0; font-size: 16px; color: #374151;">📦 Order Items</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="text-align: left; padding: 12px 16px; font-size: 14px; color: #6b7280; font-weight: 600;">Item</th>
              <th style="text-align: center; padding: 12px 16px; font-size: 14px; color: #6b7280; font-weight: 600;">Qty</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 14px; color: #6b7280; font-weight: 600;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr style="border-top: 1px solid #e5e7eb;${index % 2 === 1 ? ' background-color: #f9fafb;' : ''}">
                <td style="padding: 12px 16px; font-size: 14px; color: #374151;">${item.name}</td>
                <td style="text-align: center; padding: 12px 16px; font-size: 14px; color: #374151;">${item.quantity}</td>
                <td style="text-align: right; padding: 12px 16px; font-size: 14px; color: #374151;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #e5e7eb; background-color: #f3f4f6;">
              <td colspan="2" style="padding: 12px 16px; font-size: 16px; font-weight: bold; color: #374151;">Total</td>
              <td style="text-align: right; padding: 12px 16px; font-size: 16px; font-weight: bold; color: #2563eb;">₹${Number(orderTotal).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    ` : ''

    // Generate order items text
    const orderItemsText = items.length > 0 ? `
Order Items:
${items.map(item => `- ${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`).join('\n')}
Total: ₹${Number(orderTotal).toFixed(2)}
` : ''

    const orderDate = new Date(order.created_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    console.log(`Sending new order email to vendor: ${vendorEmail} for order: ${order_id}`)

    // Send email via Brevo API - using canteen's vendor_email as sender
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: canteenName,
          email: vendorEmail,
        },
        to: [
          {
            email: vendorEmail,
            name: vendorName,
          },
        ],
        subject: `🔔 New Order Received! – Order #${order_id.slice(0, 8).toUpperCase()}`,
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #dc2626; margin: 0; font-size: 28px;">🔔 New Order Received!</h1>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${vendorName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Great news! You have a new order for <strong>${canteenName}</strong>.</p>
                
                <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; border-radius: 12px; margin: 25px 0;">
                  <table style="width: 100%; color: white;">
                    <tr>
                      <td style="padding: 8px 0;">
                        <span style="opacity: 0.9; font-size: 14px;">Order ID</span><br>
                        <strong style="font-size: 16px;">#${order_id.slice(0, 8).toUpperCase()}</strong>
                      </td>
                      <td style="padding: 8px 0; text-align: right;">
                        <span style="opacity: 0.9; font-size: 14px;">Customer</span><br>
                        <strong style="font-size: 16px;">${customerName}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 8px 0;">
                        <span style="opacity: 0.9; font-size: 14px;">Order Time</span><br>
                        <strong style="font-size: 16px;">${orderDate}</strong>
                      </td>
                    </tr>
                  </table>
                </div>
                
                ${orderItemsHtml}
                
                <p style="font-size: 16px; margin-bottom: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  ⏱️ Please prepare this order as soon as possible and mark it as "Ready" when done.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                  Regards,<br>
                  <strong>PreOrder Team</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated notification from PreOrder.</p>
              </div>
            </body>
          </html>
        `,
        textContent: `Hello ${vendorName},

Great news! You have a new order for ${canteenName}.

Order ID: #${order_id.slice(0, 8).toUpperCase()}
Customer: ${customerName}
Order Time: ${orderDate}
${orderItemsText}
Please prepare this order as soon as possible and mark it as "Ready" when done.

Regards,
PreOrder Team

This is an automated notification from PreOrder.`,
      }),
    })

    const brevoResult = await brevoResponse.json()

    if (!brevoResponse.ok) {
      console.error('Brevo API error:', brevoResult)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email', details: brevoResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Vendor email sent successfully for order ${order_id}:`, brevoResult)

    return new Response(
      JSON.stringify({ success: true, message: 'Vendor email sent successfully', messageId: brevoResult.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending vendor email:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})