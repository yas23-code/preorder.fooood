// supabase/functions/create-razorpay-order/index.ts
//
// Creates a Razorpay order server-side (secret key never leaves the backend).
// Called by both the Flutter app and Web app after inserting an order row with payment_status='pending'.
//
// Expects JSON body:
//   { app_order_id, amount, customer_id, customer_email, customer_phone, customer_name }
//
// Returns JSON:
//   { razorpay_order_id }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const {
      app_order_id,
      amount,
      customer_id,
      customer_email,
      customer_phone,
      customer_name,
    } = await req.json();

    // ── Validate input ──
    if (!app_order_id || !amount) {
      return new Response(
        JSON.stringify({ error: "app_order_id and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Razorpay credentials ──
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    // Debug logging
    console.log(`[create-razorpay-order] keyId=${keyId?.substring(0, 10)}...`);
    console.log(`[create-razorpay-order] order_id=${app_order_id}, amount=${amount}`);

    // ── Create Razorpay order ──
    // Razorpay expects amount in paise (INR × 100)
    const amountInPaise = Math.round(Number(amount) * 100);

    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: app_order_id,
        notes: {
          customer_id: customer_id || "guest",
          customer_email: customer_email || "customer@preorder.app",
          customer_phone: customer_phone || "9999999999",
          customer_name: customer_name || "Customer",
        },
      }),
    });

    const rzpData = await rzpResponse.json();

    console.log(`[create-razorpay-order] Razorpay HTTP status=${rzpResponse.status}`);
    console.log(`[create-razorpay-order] Razorpay full response: ${JSON.stringify(rzpData)}`);

    if (!rzpResponse.ok) {
      console.error("Razorpay error:", JSON.stringify(rzpData));
      return new Response(
        JSON.stringify({ error: "Razorpay order creation failed", details: rzpData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const razorpayOrderId = rzpData.id; // e.g. "order_XXXXXXXXXXXX"

    console.log(`[create-razorpay-order] razorpay_order_id=${razorpayOrderId}`);

    // ── Update our orders table with Razorpay references ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from("orders")
      .update({
        razorpay_order_id: razorpayOrderId,
      })
      .eq("id", app_order_id);

    // ── Return to Client ──
    return new Response(
      JSON.stringify({
        razorpay_order_id: razorpayOrderId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("create-razorpay-order error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
