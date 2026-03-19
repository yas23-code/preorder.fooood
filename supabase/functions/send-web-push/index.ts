import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { user_id, title, body, url, order_id } = await req.json()

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user_id)

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        webpush.setVapidDetails(
            'mailto:support@preorder.food',
            vapidPublicKey,
            vapidPrivateKey
        )

        const pushResults = await Promise.all(
            subscriptions.map(async (sub) => {
                try {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: {
                            auth: sub.auth,
                            p256dh: sub.p256dh,
                        },
                    }

                    await webpush.sendNotification(
                        pushSubscription,
                        JSON.stringify({
                            title,
                            body,
                            url,
                            orderId: order_id,
                            tag: `order-${order_id}`
                        })
                    )
                    return { endpoint: sub.endpoint, success: true }
                } catch (err) {
                    console.error('Error sending push:', err)

                    // If subscription is expired or invalid, remove it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabase
                            .from('push_subscriptions')
                            .delete()
                            .eq('id', sub.id)
                    }

                    return { endpoint: sub.endpoint, success: false, error: err.message }
                }
            })
        )

        return new Response(JSON.stringify({ success: true, results: pushResults }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('General error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
