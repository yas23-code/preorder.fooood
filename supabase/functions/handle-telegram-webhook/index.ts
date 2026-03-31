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
        const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        if (!TELEGRAM_BOT_TOKEN) {
            return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const update = await req.json()

        console.log('Received Telegram update:', JSON.stringify(update))

        const message = update.message
        if (!message || !message.text) {
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const chatId = String(message.chat.id)
        const text = message.text.trim()
        const firstName = message.from?.first_name || 'there'

        // Handle /start command
        if (text === '/start') {
            await sendTelegramMessage(
                TELEGRAM_BOT_TOKEN,
                chatId,
                `👋 Welcome to *PreOrder Notifications*, ${firstName}!\n\n` +
                `To link this bot to your vendor account:\n` +
                `1️⃣ Open your *Vendor Dashboard* in the app\n` +
                `2️⃣ Go to *Settings*\n` +
                `3️⃣ Click *"Link Telegram"*\n` +
                `4️⃣ Copy the 6-digit code and send it here\n\n` +
                `Once linked, you'll receive instant notifications for new orders! 🔔`
            )
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Handle /help command
        if (text === '/help') {
            await sendTelegramMessage(
                TELEGRAM_BOT_TOKEN,
                chatId,
                `ℹ️ *PreOrder Bot Help*\n\n` +
                `• Send your 6-digit *link code* to connect your vendor account\n` +
                `• Use /status to check your connection status\n` +
                `• Use /unlink to disconnect your account\n\n` +
                `Need help? Contact support in the app.`
            )
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Handle /status command
        if (text === '/status') {
            const { data: linked } = await supabase
                .from('profiles')
                .select('name, email')
                .eq('telegram_chat_id', chatId)
                .single()

            if (linked) {
                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `✅ *Connected!*\n\nLinked to: *${linked.name}* (${linked.email})\n\nYou will receive order notifications here.`
                )
            } else {
                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `❌ *Not connected*\n\nSend your 6-digit link code from the Vendor Settings page to connect.`
                )
            }
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Handle /unlink command
        if (text === '/unlink') {
            const { error } = await supabase
                .from('profiles')
                .update({ telegram_chat_id: null })
                .eq('telegram_chat_id', chatId)

            if (!error) {
                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `🔓 *Account unlinked!*\n\nYou will no longer receive order notifications here.\n\nSend a new link code anytime to reconnect.`
                )
            }
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Handle link code (6-digit alphanumeric)
        const codeMatch = text.match(/^[A-Z0-9]{6}$/i)
        if (codeMatch) {
            const linkCode = text.toUpperCase()
            console.log(`Looking up link code: ${linkCode}`)

            // Find the pending link
            const { data: pendingLink, error: linkError } = await supabase
                .from('telegram_pending_links')
                .select('user_id, expires_at')
                .eq('link_code', linkCode)
                .single()

            if (linkError || !pendingLink) {
                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `❌ *Invalid or expired code*\n\nPlease generate a new link code from the Vendor Settings page.`
                )
                return new Response(JSON.stringify({ ok: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Check if code expired
            if (new Date(pendingLink.expires_at) < new Date()) {
                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `⏰ *Code expired!*\n\nPlease generate a new link code from the Vendor Settings page.`
                )
                // Clean up expired code
                await supabase.from('telegram_pending_links').delete().eq('link_code', linkCode)
                return new Response(JSON.stringify({ ok: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Link the Telegram chat to the user's profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ telegram_chat_id: chatId })
                .eq('id', pendingLink.user_id)

            if (updateError) {
                console.error('Failed to update profile:', updateError)
                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `❌ *Something went wrong*\n\nPlease try again later.`
                )
            } else {
                // Get vendor name for confirmation
                const { data: vendorProfile } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', pendingLink.user_id)
                    .single()

                await sendTelegramMessage(
                    TELEGRAM_BOT_TOKEN,
                    chatId,
                    `✅ *Account linked successfully!*\n\n` +
                    `Welcome, *${vendorProfile?.name || 'Vendor'}*! 🎉\n\n` +
                    `You will now receive instant Telegram notifications whenever a new order is placed at your canteen.\n\n` +
                    `Use /status to check your connection or /unlink to disconnect.`
                )

                // Clean up the used link code
                await supabase.from('telegram_pending_links').delete().eq('link_code', linkCode)
            }

            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Unknown message
        await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            `🤔 I don't understand that.\n\n` +
            `• Send your *6-digit link code* to connect your account\n` +
            `• Use /help for more info`
        )

        return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Webhook error:', error)
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

async function sendTelegramMessage(token: string, chatId: string, text: string) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
        }),
    })
    const result = await response.json()
    if (!response.ok) {
        console.error('Failed to send Telegram message:', JSON.stringify(result))
    }
    return result
}
