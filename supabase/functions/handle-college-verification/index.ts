import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
    action: 'send_otp' | 'verify_otp'
    email?: string
    otp?: string
    user_id: string
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
            return new Response(
                JSON.stringify({ success: false, error: 'Brevo API key not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const { action, email, otp, user_id }: RequestPayload = await req.json()

        if (action === 'send_otp') {
            if (!email) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Email is required' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Generate 6-digit OTP
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()

            // Store OTP in database
            const { error: dbError } = await supabase
                .from('college_verifications')
                .insert({
                    user_id,
                    email,
                    otp: generatedOtp,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
                })

            if (dbError) {
                console.error('Error storing OTP:', dbError)
                return new Response(
                    JSON.stringify({ success: false, error: 'Failed to generate OTP' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Send email via Brevo
            const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: 'PreOrder Verification',
                        email: FROM_EMAIL,
                    },
                    to: [{ email }],
                    subject: 'Your PreOrder Verification Code',
                    htmlContent: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #e11d48; text-align: center;">College Verification</h2>
                  <p>Hello,</p>
                  <p>Thank you for verifying your ABES Engineering College affiliation. Use the following code to complete your verification:</p>
                  <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #e11d48;">${generatedOtp}</span>
                  </div>
                  <p>This code will expire in 10 minutes.</p>
                  <p>If you didn't request this, please ignore this email.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="font-size: 12px; color: #999; text-align: center;">PreOrder - ABES Engineering College</p>
                </div>
              </body>
            </html>
          `,
                }),
            })

            if (!brevoResponse.ok) {
                const brevoError = await brevoResponse.json()
                console.error('Brevo API error:', brevoError)
                return new Response(
                    JSON.stringify({ success: false, error: 'Failed to send email' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: true, message: 'OTP sent successfully' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'verify_otp') {
            if (!otp) {
                return new Response(
                    JSON.stringify({ success: false, error: 'OTP is required' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Check OTP in database
            const { data, error: fetchError } = await supabase
                .from('college_verifications')
                .select('*')
                .eq('user_id', user_id)
                .eq('otp', otp)
                .gt('expires_at', new Date().toISOString())
                .is('verified_at', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (fetchError || !data) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid or expired OTP' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Mark as verified in college_verifications
            await supabase
                .from('college_verifications')
                .update({ verified_at: new Date().toISOString() })
                .eq('id', data.id)

            // Update user profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    is_abes_student: true,
                    is_abes_verified: true
                })
                .eq('id', user_id)

            if (updateError) {
                console.error('Error updating profile:', updateError)
                return new Response(
                    JSON.stringify({ success: false, error: 'Failed to update profile' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Verification successful' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: false, error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
