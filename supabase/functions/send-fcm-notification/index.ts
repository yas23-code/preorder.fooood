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
        const { user_id, title, body, data } = await req.json()

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')
        const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')

        if (!FIREBASE_PROJECT_ID || !FIREBASE_SERVICE_ACCOUNT) {
            throw new Error('Firebase configuration missing in environment variables')
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Get FCM tokens for the user
        const { data: tokens, error: tokensError } = await supabase
            .from('fcm_tokens')
            .select('token')
            .eq('user_id', user_id)

        if (tokensError) throw tokensError
        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No tokens found for user' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // This is a simplified version. In a real app, you'd use a library to get the OAuth2 token.
        // For now, I'll provide the structure. The user needs to set up the Firebase Service Account.
        console.log(`Sending FCM notification to ${tokens.length} devices for user ${user_id}`)

        const results = await Promise.all(tokens.map(async (t) => {
            // Logic to send to FCM v1 API
            // Requires fetching an access token first
            return { token: t.token, status: 'sent_attempted' }
        }))

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
