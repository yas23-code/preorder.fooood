// supabase/functions/verify-cashfree-payment/index.ts
//
// Verifies a Cashfree payment server-side by calling the Cashfree Get Order API.
// If the order is PAID, updates public.orders to payment_status='paid'.
//
// Expects JSON body:
//   { app_order_id, cf_order_id }
//
// Returns JSON:
//   { success: true/false, order_status: string }
//
// Required Supabase secrets:
//   CASHFREE_APP_ID
//   CASHFREE_SECRET_KEY
//   CASHFREE_ENV
//   SUPABASE_URL (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";

serve(async (req: Request) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const bodyJson = await req.json();
    const app_order_id = bodyJson.app_order_id || bodyJson.order_id || bodyJson.orderId;
    let cf_order_id = bodyJson.cf_order_id || bodyJson.cfOrderId;

    if (!app_order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order from DB
    const { data: dbOrder, error: dbOrderErr } = await supabase
      .from("orders")
      .select("id, payment_status, status, razorpay_order_id, razorpay_payment_id, cashfree_order_id, canteen_id, student_id, total_amount, token_number")
      .eq("id", app_order_id)
      .single();

    if (dbOrderErr || !dbOrder) {
      return new Response(
        JSON.stringify({ error: `Order not found: ${dbOrderErr?.message || app_order_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If order was ALREADY marked as paid in DB, return success immediately!
    if (dbOrder.payment_status === "paid") {
      return new Response(
        JSON.stringify({ success: true, order_status: "PAID", message: "Order already paid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let isPaid = false;

    // Check if this was paid via Razorpay (e.g. web migrated or hybrid)
    if (dbOrder.razorpay_order_id) {
      const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_live_U002iO4E2ckCxm";
      const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "PivrS0pP8gvG15bHu8ODguCt";
      if (keyId && keySecret) {
        try {
          const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);
          const rzpRes = await fetch(
            `https://api.razorpay.com/v1/orders/${dbOrder.razorpay_order_id}/payments`,
            { headers: { Authorization: authHeader } }
          );
          if (rzpRes.ok) {
            const rzpData = await rzpRes.json();
            const items = rzpData.items || [];
            const succ = items.find((p: any) => p.status === "captured" || p.status === "authorized");
            if (succ) {
              isPaid = true;
            }
          }
        } catch (rzpErr) {
          console.error("Razorpay lookup fallback error in cashfree func:", rzpErr);
        }
      }
    }

    // If not verified yet, verify via Cashfree
    if (!isPaid) {
      if (!cf_order_id && dbOrder.cashfree_order_id) {
        cf_order_id = dbOrder.cashfree_order_id;
      }

      if (cf_order_id) {
        const appId = Deno.env.get("CASHFREE_APP_ID")!;
        const secretKey = Deno.env.get("CASHFREE_SECRET_KEY")!;
        const cfEnv = Deno.env.get("CASHFREE_ENV") || "SANDBOX";

        const baseUrl =
          cfEnv === "PRODUCTION"
            ? "https://api.cashfree.com/pg"
            : "https://sandbox.cashfree.com/pg";

        const cfResponse = await fetch(`${baseUrl}/orders/${cf_order_id}`, {
          method: "GET",
          headers: {
            "x-api-version": "2023-08-01",
            "x-client-id": appId,
            "x-client-secret": secretKey,
          },
        });

        const cfData = await cfResponse.json();
        if (cfResponse.ok) {
          isPaid = cfData.order_status === "PAID";
        }
      }
    }

    if (isPaid) {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          paid_at: new Date().toISOString(),
        })
        .eq("id", app_order_id);

      // ── Send Push Notification via FCM HTTP v1 ──
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("canteen_id, order_number, token_number")
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
            // Bypasses WAL RLS limitations so the dashboard instantly refreshes without waiting for the next polling cycle
            try {
              const channel = supabase.channel('vendor_updates');
              await channel.subscribe();
              await channel.send({
                type: 'broadcast',
                event: 'refresh_orders',
                payload: { order_id: app_order_id, status: 'confirmed', vendor_id: canteenData.vendor_id }
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
                            title: "New Order Received! 🔔",
                            body: `Order #${orderData.order_number || (orderData as any).token_number || (app_order_id.length >= 4 ? app_order_id.substring(0, 4).toUpperCase() : '')} has been paid and is ready for prep.`,
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
              } else {
                console.error("Missing FIREBASE_SERVICE_ACCOUNT_B64 or FIREBASE_PROJECT_ID secrets.");
              }
            }
          }
        }
      } catch (pushErr) {
        console.error("Error sending push notification or broadcast:", pushErr);
      }

      // ── Send Telegram Notification to Vendor ──
      try {
        const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (telegramBotToken) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("id, canteen_id, student_id, user_id, total, total_amount, token_number, order_number, order_no")
            .eq("id", app_order_id)
            .single();

          if (orderData?.canteen_id) {
            const { data: canteenData } = await supabase
              .from("canteens")
              .select("vendor_id, name")
              .eq("id", orderData.canteen_id)
              .single();

            if (canteenData?.vendor_id) {
              const { data: vendorProfile } = await supabase
                .from("profiles")
                .select("telegram_chat_id, name")
                .eq("id", canteenData.vendor_id)
                .maybeSingle();

              if (vendorProfile?.telegram_chat_id) {
                // Fetch customer details
                const custId = (orderData as any)?.student_id || (orderData as any)?.user_id;
                let customerName = "Customer";
                if (custId) {
                  const { data: custProfile } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("id", custId)
                    .maybeSingle();
                  if (custProfile?.name) customerName = custProfile.name;
                }

                // Fetch order items
                const { data: orderItems } = await supabase
                  .from("order_items")
                  .select("name, quantity, price")
                  .eq("order_id", app_order_id);

                const items = orderItems || [];
                const canteenName = canteenData.name || "Your Canteen";
                const totalVal = (orderData as any)?.total_amount ?? (orderData as any)?.total ?? items.reduce((s: number, i: any) => s + (Number(i.price) * Number(i.quantity)), 0);
                const shortId = app_order_id.length >= 4 ? app_order_id.substring(0, 4).toUpperCase() : "";
                const displayNum = (orderData as any)?.order_number || (orderData as any)?.token_number || (orderData as any)?.order_no || shortId;

                const itemsText = items.length > 0
                  ? items.map((i: any) => `  • ${i.name} x${i.quantity} — ₹${(Number(i.price) * Number(i.quantity)).toFixed(0)}`).join('\n')
                  : '  • 1x Order';

                const telegramMessage =
                  `🔔 *New Order Received!*\n\n` +
                  `📋 *Order:* #${displayNum}\n` +
                  `🏪 *Canteen:* ${canteenName}\n` +
                  `👤 *Customer:* ${customerName}\n\n` +
                  `📦 *Items:*\n` +
                  `${itemsText}\n\n` +
                  `💰 *Total: ₹${Number(totalVal).toFixed(0)}*\n\n` +
                  `⏱️ Please prepare this order and mark it as "Ready" when done!`;

                const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: vendorProfile.telegram_chat_id,
                    text: telegramMessage,
                    parse_mode: "Markdown",
                  }),
                });
                const tgJson = await tgRes.json();
                console.log(`[verify-cashfree-payment] Telegram notification sent to ${vendorProfile.telegram_chat_id}:`, JSON.stringify(tgJson));
              } else {
                console.log(`[verify-cashfree-payment] Vendor ${canteenData.vendor_id} has not linked Telegram.`);
              }
            }
          }
        }
      } catch (tgErr) {
        console.error("[verify-cashfree-payment] Error sending Telegram notification:", tgErr);
      }
    } else {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
        })
        .eq("id", app_order_id);
    }

    return new Response(
      JSON.stringify({
        success: isPaid,
        order_status: orderStatus,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-cashfree-payment error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
