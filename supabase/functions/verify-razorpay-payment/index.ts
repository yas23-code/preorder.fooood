// supabase/functions/verify-razorpay-payment/index.ts
//
// Verifies a Razorpay payment server-side.
// Supports TWO verification methods:
//   1. Cryptographic HMAC-SHA256 signature verification (when client gets signature)
//   2. Direct Razorpay Orders & Payments API verification (server-to-server check)
//      This guarantees that if money was deducted (UPI / late auth / app switch),
//      the payment is STILL verified and confirmed as SUCCESSFUL!
//
// Expects JSON body:
//   { app_order_id, razorpay_order_id, razorpay_payment_id?, razorpay_signature? }
//
// Returns JSON:
//   { success: true/false, payment_id?: string, order_status?: string }
//
// Required Supabase secrets:
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   SUPABASE_URL (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   FIREBASE_SERVICE_ACCOUNT_B64 (for push notifications)
//   FIREBASE_PROJECT_ID (for push notifications)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";
import { createHmac } from "node:crypto";

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!app_order_id || !razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: "app_order_id and razorpay_order_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    let isValid = false;
    let verifiedPaymentId = razorpay_payment_id || "";

    // ── Method 1: Check HMAC SHA-256 signature if provided ──
    if (razorpay_payment_id && razorpay_signature) {
      try {
        const expectedSignature = createHmac("sha256", keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        if (expectedSignature === razorpay_signature) {
          isValid = true;
          console.log(`[verify-razorpay-payment] Signature valid for order ${razorpay_order_id}`);
        }
      } catch (sigErr) {
        console.error("[verify-razorpay-payment] Signature error:", sigErr);
      }
    }

    // ── Method 2: Direct Razorpay API verification (Fallback & Truth Check) ──
    // If signature check wasn't performed or failed (e.g. UPI app switch or timeout),
    // query Razorpay server directly to see if the money was actually captured!
    if (!isValid && keyId && keySecret) {
      try {
        console.log(`[verify-razorpay-payment] Checking Razorpay API for order ${razorpay_order_id}...`);
        const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

        // Check payments linked to this order
        const paymentsRes = await fetch(
          `https://api.razorpay.com/v1/orders/${razorpay_order_id}/payments`,
          {
            headers: {
              Authorization: authHeader,
            },
          }
        );

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const items = paymentsData.items || [];
          console.log(`[verify-razorpay-payment] Found ${items.length} payment attempts for order`);

          // Look for any payment that is 'captured' or 'authorized'
          const successfulPayment = items.find(
            (p: any) => p.status === "captured" || p.status === "authorized"
          );

          if (successfulPayment) {
            isValid = true;
            verifiedPaymentId = successfulPayment.id;
            console.log(`[verify-razorpay-payment] Found successful payment: ${verifiedPaymentId} (status: ${successfulPayment.status})`);
          }
        }

        // Also check order status itself
        if (!isValid) {
          const orderRes = await fetch(
            `https://api.razorpay.com/v1/orders/${razorpay_order_id}`,
            {
              headers: {
                Authorization: authHeader,
              },
            }
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            if (orderData.status === "paid") {
              isValid = true;
              console.log(`[verify-razorpay-payment] Order status is 'paid'`);
            }
          }
        }
      } catch (apiErr) {
        console.error("[verify-razorpay-payment] Error calling Razorpay API:", apiErr);
      }
    }

    // ── Update our DB ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (isValid) {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "pending",
          razorpay_payment_id: verifiedPaymentId,
          paid_at: new Date().toISOString(),
        })
        .eq("id", app_order_id);

      // ── Send Push Notification via FCM HTTP v1 ──
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("canteen_id, order_number")
          .eq("id", app_order_id)
          .single();

        if (orderData?.canteen_id) {
          const { data: canteenData } = await supabase
            .from("canteens")
            .select("vendor_id")
            .eq("id", orderData.canteen_id)
            .single();

          if (canteenData?.vendor_id) {
            // --- BROADCAST TO VENDOR UI ---
            try {
              const channel = supabase.channel('vendor_updates');
              await channel.subscribe();
              await channel.send({
                type: 'broadcast',
                event: 'refresh_orders',
                payload: { order_id: app_order_id, status: 'pending', vendor_id: canteenData.vendor_id }
              });
              await supabase.removeChannel(channel);
            } catch (bErr) {
              console.error("Broadcast err:", bErr);
            }

            const { data: tokensData } = await supabase
              .from("user_device_tokens")
              .select("fcm_token")
              .eq("user_id", canteenData.vendor_id);

            if (tokensData && tokensData.length > 0) {
              const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_B64");
              const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

              if (serviceAccountStr && projectId) {
                const cleanB64 = serviceAccountStr.replace(/[^A-Za-z0-9+/=]/g, "");
                let serviceAccount;
                try {
                  serviceAccount = JSON.parse(atob(cleanB64));
                } catch (parseErr: any) {
                  throw new Error(`Failed to parse service account JSON: ${parseErr.message}`);
                }

                const jwtClient = new JWT({
                  email: serviceAccount.client_email,
                  key: serviceAccount.private_key,
                  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
                });

                const authTokens = await jwtClient.authorize();
                const accessToken = authTokens.access_token;

                for (const t of tokensData) {
                  const fcmResponse = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                      },
                      body: JSON.stringify({
                        message: {
                          token: t.fcm_token,
                          notification: {
                            title: "New Order Received!",
                            body: `Order #${orderData.order_number || ''} has been paid and is ready for prep.`,
                          },
                          data: {
                            route: "/home",
                          },
                        },
                      }),
                    }
                  );
                  if (!fcmResponse.ok) {
                    console.error("FCM Send Error:", await fcmResponse.text());
                  } else {
                    console.log("FCM Notification sent to", t.fcm_token);
                  }
                }
              }
            }
          }
        }
      } catch (pushErr) {
        console.error("Error sending push notification or broadcast:", pushErr);
      }
    } else {
      // Don't mark as permanently failed if it was just pending/unverified
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
        })
        .eq("id", app_order_id)
        .eq("payment_status", "pending");
    }

    return new Response(
      JSON.stringify({
        success: isValid,
        payment_id: verifiedPaymentId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("verify-razorpay-payment error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
