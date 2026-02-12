import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch unprocessed notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`)
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${notifications.length} notifications`)

    const results = []

    for (const notification of notifications) {
      try {
        console.log(`Processing notification ${notification.id} for user: ${notification.user_id}`)
        
        // Extract notification details
        const pickupCode = notification.message?.match(/Pickup code: (\w+)/)?.[1] || ''
        const canteenName = notification.message?.match(/from (.+?) is ready/)?.[1] || 'the canteen'

        let telegramSent = false
        let emailSent = false

        // Send Telegram notification
        try {
          const telegramResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-telegram-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              order_id: notification.order_id,
              user_id: notification.user_id,
              pickup_code: pickupCode,
              canteen_name: canteenName
            })
          })
          const telegramResult = await telegramResponse.json()
          console.log('Telegram notification result:', telegramResult)
          telegramSent = telegramResponse.ok && telegramResult.success
        } catch (telegramError) {
          console.log('Telegram notification failed:', telegramError)
        }

        // Send Brevo email notification
        try {
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-brevo-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              order_id: notification.order_id,
              user_id: notification.user_id,
              pickup_code: pickupCode,
              canteen_name: canteenName
            })
          })
          const emailResult = await emailResponse.json()
          console.log('Brevo email notification result:', emailResult)
          emailSent = emailResponse.ok && emailResult.success
        } catch (emailError) {
          console.log('Brevo email notification failed:', emailError)
        }

        // Mark notification as processed
        await supabase
          .from('notification_queue')
          .update({ processed: true })
          .eq('id', notification.id)

        results.push({
          id: notification.id,
          success: telegramSent || emailSent,
          telegramSent,
          emailSent,
        })
        
        console.log(`Notification ${notification.id} processed - Telegram: ${telegramSent}, Email: ${emailSent}`)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to process notification ${notification.id}:`, errorMessage)
        
        // Still mark as processed to prevent infinite retries
        await supabase
          .from('notification_queue')
          .update({ processed: true })
          .eq('id', notification.id)
          
        results.push({
          id: notification.id,
          success: false,
          error: errorMessage,
        })
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error processing queue:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
