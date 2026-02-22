import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  order_id: string
  user_id: string
  pickup_code: string
  shop_id: string
  shop_name?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@preorder.food'

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Brevo API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: EmailPayload = await req.json()
    const { order_id, user_id, pickup_code, shop_id, shop_name } = payload

    console.log(`Processing shop email notification for order: ${order_id}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_name, phone')
      .eq('id', shop_id)
      .single()

    if (shopError || !shop) {
      console.error('Failed to get shop:', shopError)
      return new Response(
        JSON.stringify({ success: false, error: 'Shop not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if email already sent for this order (prevent duplicates)
    const { data: existingEmail, error: checkError } = await supabase
      .from('shop_email_notifications_sent')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing email:', checkError)
    }

    if (existingEmail) {
      console.log(`Email already sent for shop order ${order_id}, skipping`)
      return new Response(
        JSON.stringify({ success: true, message: 'Email already sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', user_id)
      .single()

    if (profileError || !profile?.email) {
      console.error('Failed to get user profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('shop_order_items')
      .select('name, quantity, price')
      .eq('order_id', order_id)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
    }

    // Get order total
    const { data: orderData, error: orderError } = await supabase
      .from('shop_orders')
      .select('total')
      .eq('id', order_id)
      .single()

    if (orderError) {
      console.error('Error fetching order total:', orderError)
    }

    const userEmail = profile.email
    const userName = profile.name || 'Customer'
    const items = orderItems || []
    const orderTotal = orderData?.total || 0
    const finalShopName = shop_name || shop.shop_name || 'Your Shop'

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

    console.log(`Sending shop email to: ${userEmail} for order: ${order_id} with ${items.length} items`)

    // Send email via Brevo API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: finalShopName,
          email: FROM_EMAIL,
        },
        to: [
          {
            email: userEmail,
            name: userName,
          },
        ],
        subject: `Your Order is Ready for Pickup – Order #${order_id.slice(0, 8).toUpperCase()}`,
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #16a34a; margin: 0; font-size: 28px;">🎉 Your Order is Ready!</h1>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Good news! 🎉</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Your order with ID <strong style="color: #16a34a;">#${order_id.slice(0, 8).toUpperCase()}</strong> from <strong>${finalShopName}</strong> is now <strong style="color: #16a34a;">READY</strong> for pickup.</p>
                
                <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">Your Pickup Code</p>
                  <p style="margin: 15px 0 0; font-size: 36px; font-weight: bold; color: #ffffff; letter-spacing: 4px; font-family: 'Courier New', monospace;">${pickup_code}</p>
                </div>
                
                ${orderItemsHtml}
                
                <p style="font-size: 16px; margin-bottom: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  📍 Please show this code at the shop to collect your order.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 10px;">Thank you for ordering with us!</p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                  Regards,<br>
                  <strong>${finalShopName}</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated message from PreOrder. Please do not reply to this email.</p>
              </div>
            </body>
          </html>
        `,
        textContent: `Hello ${userName},

Good news! 🎉

Your order with ID #${order_id.slice(0, 8).toUpperCase()} from ${finalShopName} is now READY for pickup.

Pickup Code: ${pickup_code}
${orderItemsText}
Please show this code at the shop to collect your order.

Thank you for ordering with us!

Regards,
${finalShopName}

This is an automated message from PreOrder.`,
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

    console.log(`Shop email sent successfully for order ${order_id}:`, brevoResult)

    // Record successful email send
    const { error: insertError } = await supabase
      .from('shop_email_notifications_sent')
      .insert({
        order_id,
        user_id,
        status: 'sent',
      })

    if (insertError) {
      console.error('Failed to record email sent:', insertError)
      // Don't fail the request, email was sent successfully
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', messageId: brevoResult.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending shop email:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
