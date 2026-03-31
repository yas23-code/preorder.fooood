import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramPayload {
    order_id: string
    user_id: string
    pickup_code?: string
    canteen_name?: string
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        if (!TELEGRAM_BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN not configured')
            return new Response(
                JSON.stringify({ success: false, error: 'Telegram bot token not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const payload: TelegramPayload = await req.json()
        const { order_id, user_id, pickup_code, canteen_name } = payload

        console.log(`Sending Telegram notification for order ${order_id} to user ${user_id}`)

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Get user's telegram_chat_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('telegram_chat_id, name')
            .eq('id', user_id)
            .single()

        if (profileError || !profile) {
            console.log('Could not find user profile:', profileError)
            return new Response(
                JSON.stringify({ success: false, error: 'User profile not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!profile.telegram_chat_id) {
            console.log(`User ${user_id} has no Telegram chat ID linked`)
            return new Response(
                JSON.stringify({ success: false, error: 'User has not linked Telegram' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Build the message
        const message = `🍽️ *Your Order is Ready!*\n\n` +
            `📍 *Canteen:* ${canteen_name || 'Your Canteen'}\n` +
            `🔑 *Pickup Code:* \`${pickup_code || 'N/A'}\`\n\n` +
            `Please collect your order now! 🎉`

        // Send Telegram message
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: profile.telegram_chat_id,
                text: message,
                parse_mode: 'Markdown',
            }),
        })

        const telegramResult = await telegramResponse.json()

        if (!telegramResponse.ok) {
            console.error('Telegram API error:', JSON.stringify(telegramResult))
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to send Telegram message', details: telegramResult }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Log the sent notification
        await supabase.from('telegram_notifications').insert({
            user_id,
            order_id,
            message_id: String(telegramResult.result?.message_id || ''),
        })

        console.log(`Telegram notification sent successfully for order ${order_id}`)

        return new Response(
            JSON.stringify({ success: true, messageId: telegramResult.result?.message_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error sending Telegram notification:', error)
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
