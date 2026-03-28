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

    const payload = await req.json().catch(() => ({}))
    const isTest = payload.test === true
    const testEmail = payload.test_email

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let profilesToSend = []

    if (isTest && testEmail) {
      console.log(`Running in TEST mode for email: ${testEmail}`)
      profilesToSend = [{ email: testEmail, name: 'Test User' }]
    } else {
      // Fetch all profiles with role 'student'
      console.log('Fetching student profiles...')
      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('role', 'student')

      if (studentError) {
        console.error('Error fetching students:', studentError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch students', details: studentError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      profilesToSend = students || []
    }

    if (profilesToSend.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients found to send emails' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting broadcast to ${profilesToSend.length} recipients...`)

    const subject = "Sach bata... Line mein khada rahega? 😩"
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
        <p style="font-size: 18px; margin-bottom: 25px;">Hey 👋</p>
        
        <p style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Sach bata…</p>
        <p style="margin-bottom: 25px;">Aaj phir line mein khada rahega? 😩</p>
        
        <p style="margin-bottom: 20px;">Ya phir <strong style="color: #e63946;">thoda level up karega? 😎👇</strong></p>
        
        <p style="font-size: 24px; font-weight: bold; color: #1d3557; margin-bottom: 25px;">👉 Preorder use kar 🚀</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <img src="https://images.unsplash.com/photo-1551782450-a2132b4ba21d" alt="Food ready burger" style="width:100%; max-width: 500px; border-radius:15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);" />
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 5px solid #1d3557; margin: 30px 0;">
          <p style="font-size: 18px; font-weight: bold; margin-top: 0;">Order pehle → seedha pickup 🍔✨</p>
          <p style="margin-bottom: 0;">No wait. No stress. Full smartness 🔥</p>
        </div>
        
        <p style="font-style: italic; background-color: #f1faee; padding: 15px; border-radius: 8px; text-align: center; color: #2d6a4f; font-weight: 600;">
          Line wale alag… Preorder wale alag level 😏
        </p>
        
        <p style="margin-top: 30px; font-size: 16px;">Try kar ek baar… aadat ban jayegi 😉</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">PreOrder Food - Skip the Line, Not the Meal</p>
      </div>
    `

    let totalSent = 0
    let errors = []

    // Send individual emails to prevent privacy leaks
    for (const student of profilesToSend) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: "PreOrder Food",
              email: FROM_EMAIL,
            },
            to: [{
              email: student.email,
              name: student.name || 'Student'
            }],
            subject: subject,
            htmlContent: htmlContent,
          }),
        })

        if (!response.ok) {
          const detail = await response.json()
          console.error(`Error sending to ${student.email}:`, detail)
          errors.push({ email: student.email, error: detail })
        } else {
          totalSent++
        }
      } catch (err) {
        console.error(`Exception for ${student.email}:`, err)
        errors.push({ email: student.email, error: err.message })
      }

      // Add a small delay if not in test mode to avoid rate limiting
      if (!isTest && profilesToSend.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    console.log(`Broadcast finished. Total sent: ${totalSent}/${profilesToSend.length}. Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ 
        success: errors.length === 0, 
        message: 'Broadcast completed', 
        totalSent, 
        totalFound: profilesToSend.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in broadcast function:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
