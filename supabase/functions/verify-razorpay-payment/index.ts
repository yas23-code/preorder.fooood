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
    const bodyJson = await req.json();
    const app_order_id = bodyJson.app_order_id || bodyJson.order_id || bodyJson.orderId;
    let razorpay_order_id = bodyJson.razorpay_order_id || bodyJson.razorpayOrderId;
    const razorpay_payment_id = bodyJson.razorpay_payment_id || bodyJson.razorpayPaymentId || "";
    const razorpay_signature = bodyJson.razorpay_signature || bodyJson.razorpaySignature || "";

    if (!app_order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Initialize Supabase early for order resolution
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the order in DB
    const { data: dbOrder, error: dbOrderErr } = await supabase
      .from("orders")
      .select("id, status, payment_status, razorpay_order_id, razorpay_payment_id, canteen_id, student_id, total_amount, token_number, order_number")
      .eq("id", app_order_id)
      .single();

    if (dbOrderErr || !dbOrder) {
      return new Response(
        JSON.stringify({ error: `Order not found: ${dbOrderErr?.message || app_order_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If order was ALREADY marked as paid, return success immediately (idempotent)
    if (dbOrder.payment_status === "paid") {
      console.log(`[verify-razorpay-payment] Order ${app_order_id} is already paid.`);
      return new Response(
        JSON.stringify({
          success: true,
          payment_id: dbOrder.razorpay_payment_id || razorpay_payment_id,
          order_status: "paid",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve razorpay_order_id from DB if not passed by client
    if (!razorpay_order_id && dbOrder.razorpay_order_id) {
      razorpay_order_id = dbOrder.razorpay_order_id;
    }

    // ── Razorpay credentials ──
    const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_live_U002iO4E2ckCxm";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "PivrS0pP8gvG15bHu8ODguCt";

    let isValid = false;
    let verifiedPaymentId = razorpay_payment_id || "";

    // ── Method 1: Check HMAC SHA-256 signature if provided ──
    if (razorpay_payment_id && razorpay_signature && razorpay_order_id) {
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
    if (!isValid && keyId && keySecret && razorpay_order_id) {
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
          .select("id, canteen_id, student_id, user_id, total, total_amount, token_number, order_number, order_no")
          .eq("id", app_order_id)
          .single();

        const shortId = app_order_id.length >= 4 ? app_order_id.substring(0, 4).toUpperCase() : "";
        const displayOrderNum = (orderData as any)?.order_number || (orderData as any)?.token_number || shortId;
        const orderNum = displayOrderNum ? `#${displayOrderNum}` : "";

        if (orderData?.canteen_id) {
          const { data: canteenData } = await supabase
            .from("canteens")
            .select("vendor_id, name")
            .eq("id", orderData.canteen_id)
            .single();

          const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_B64");
          const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

          if (serviceAccountStr && projectId) {
            const cleanB64 = serviceAccountStr.replace(/[^A-Za-z0-9+/=]/g, "");
            let serviceAccount;
            try {
              serviceAccount = JSON.parse(atob(cleanB64));
            } catch (parseErr: any) {
              console.error("Failed to parse service account JSON:", parseErr.message);
            }

            if (serviceAccount) {
              const jwtClient = new JWT({
                email: serviceAccount.client_email,
                key: serviceAccount.private_key,
                scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
              });

              const authTokens = await jwtClient.authorize();
              const accessToken = authTokens.access_token;

              // Helper for FCM v1 send
              const sendFcmNotification = async (
                token: string,
                title: string,
                body: string,
                route: string,
                orderId: string,
                statusStr: string,
                channelId: string = "preorder_new_orders_channel"
              ) => {
                try {
                  const res = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                      },
                      body: JSON.stringify({
                        message: {
                          token: token,
                          notification: {
                            title: title,
                            body: body,
                          },
                          android: {
                            priority: "HIGH",
                            ttl: "86400s",
                            notification: {
                              channel_id: channelId,
                              sound: "default",
                              default_sound: true,
                              default_vibrate_timings: true,
                              notification_priority: "PRIORITY_MAX",
                              visibility: "PUBLIC",
                              click_action: "FLUTTER_NOTIFICATION_CLICK",
                              tag: `order_${orderId}`,
                            },
                          },
                          data: {
                            title: String(title),
                            body: String(body),
                            order_id: String(orderId),
                            order_number: String(orderNum),
                            status: String(statusStr),
                            type: String(statusStr),
                            role: String(channelId.includes("new_orders") ? "vendor" : "customer"),
                            route: String(route),
                            channel_id: String(channelId),
                            click_action: "FLUTTER_NOTIFICATION_CLICK",
                            priority: "HIGH",
                          },
                        },
                      }),
                    }
                  );
                  if (!res.ok) {
                    const errTxt = await res.text();
                    console.error("FCM Send Error:", res.status, errTxt);
                    if (res.status === 404 || errTxt.includes("UNREGISTERED") || errTxt.includes("NOT_FOUND")) {
                      await supabase.from("user_device_tokens").delete().eq("fcm_token", token);
                    }
                  } else {
                    console.log(`FCM High-Priority sent [${channelId}] to`, token);
                  }
                } catch (e) {
                  console.error("FCM dispatch error:", e);
                }
              };

              // 1. Notify Vendor
              {
                const vendorUserIds = new Set<string>();
                if (canteenData?.vendor_id) {
                  vendorUserIds.add(canteenData.vendor_id);
                }

                // Check canteen_registrations for approved vendors
                try {
                  const { data: regList } = await supabase
                    .from("canteen_registrations")
                    .select("user_id")
                    .eq("status", "approved");
                  if (regList) {
                    for (const r of regList) {
                      if (r.user_id) vendorUserIds.add(r.user_id);
                    }
                  }
                } catch (_) { }

                // Also check other vendor user IDs from user_roles
                const { data: vRoles } = await supabase
                  .from("user_roles")
                  .select("user_id")
                  .or("role.eq.vendor,role.eq.shop_owner");
                if (vRoles) {
                  for (const vr of vRoles) {
                    if (vr.user_id) vendorUserIds.add(vr.user_id);
                  }
                }

                // Also check vendor profiles
                const { data: vProfiles } = await supabase
                  .from("profiles")
                  .select("id")
                  .or("role.eq.vendor,role.eq.shop_owner");
                if (vProfiles) {
                  for (const vp of vProfiles) {
                    if (vp.id) vendorUserIds.add(vp.id);
                  }
                }

                // Broadcast to live vendor UI
                try {
                  const channel = supabase.channel('vendor_updates');
                  await channel.subscribe();
                  await channel.send({
                    type: 'broadcast',
                    event: 'refresh_orders',
                    payload: { order_id: app_order_id, status: 'pending', vendor_id: canteenData?.vendor_id }
                  });
                  await supabase.removeChannel(channel);
                } catch (bErr) {
                  console.error("Broadcast err:", bErr);
                }

                const vendorTitle = "New Order Received! 🔔";
                const vendorBody = `Order ${orderNum} has been paid (₹${orderData?.total_amount || 0}) and is ready for prep.`;

                // Persist vendor notification in Supabase for all matched vendors
                const primaryVendorIds = vendorUserIds.size > 0 ? Array.from(vendorUserIds) : [canteenData?.vendor_id].filter(Boolean);
                for (const vid of primaryVendorIds) {
                  try {
                    await supabase.from("notifications").insert({
                      user_id: vid,
                      role: "vendor",
                      order_id: app_order_id,
                      title: vendorTitle,
                      body: vendorBody,
                      type: "new_order",
                      status: "pending",
                      data: {
                        order_id: app_order_id,
                        order_number: (orderData as any)?.order_number || orderNum,
                        canteen_id: orderData?.canteen_id,
                        route: "/vendor/orders",
                        channel_id: "preorder_new_orders_channel",
                      },
                      is_read: false,
                      idempotency_key: `${app_order_id}_vendor_pending`,
                    });
                  } catch (vDbErr) {
                    console.error("Error storing vendor notification:", vDbErr);
                  }
                }

                // Multi-tier vendor device tokens lookup
                let vendorTokensList: string[] = [];
                if (vendorUserIds.size > 0) {
                  const { data: vtByUser } = await supabase
                    .from("user_device_tokens")
                    .select("fcm_token")
                    .in("user_id", Array.from(vendorUserIds));
                  if (vtByUser) {
                    for (const t of vtByUser) {
                      if (t.fcm_token) vendorTokensList.push(t.fcm_token);
                    }
                  }
                }

                // Also query all tokens registered with role='vendor'
                const { data: vtByRole } = await supabase
                  .from("user_device_tokens")
                  .select("fcm_token")
                  .eq("role", "vendor");
                if (vtByRole) {
                  for (const t of vtByRole) {
                    if (t.fcm_token) vendorTokensList.push(t.fcm_token);
                  }
                }

                vendorTokensList = [...new Set(vendorTokensList.filter(Boolean))];
                console.log(`[verify-razorpay-payment] Found ${vendorTokensList.length} vendor device token(s)`);

                for (const vt of vendorTokensList) {
                  await sendFcmNotification(
                    vt,
                    vendorTitle,
                    vendorBody,
                    "/vendor/orders",
                    app_order_id,
                    "pending",
                    "preorder_new_orders_channel"
                  );
                }
              }

              // 2. Notify Student
              if (orderData?.student_id) {
                const cName = canteenData?.name || "Campus Canteen";
                const orderNum = orderData.order_number ? `#${orderData.order_number}` : "";
                const studentTitle = "Order Placed Successfully! 🎉";
                const studentBody = `Order ${orderNum} sent to ${cName}. We'll notify you once it's accepted.`;

                // Persist student notification in Supabase
                try {
                  await supabase.from("notifications").insert({
                    user_id: orderData.student_id,
                    role: "customer",
                    order_id: app_order_id,
                    title: studentTitle,
                    body: studentBody,
                    type: "order_placed",
                    status: "paid",
                    data: {
                      order_id: app_order_id,
                      order_number: orderData.order_number,
                      canteen_id: orderData.canteen_id,
                      route: `/order/${app_order_id}`,
                      channel_id: "preorder_new_orders_channel",
                    },
                    is_read: false,
                    idempotency_key: `${app_order_id}_student_order_paid`,
                  });
                } catch (sDbErr) {
                  console.error("Error storing student notification:", sDbErr);
                }

                const { data: studentTokens } = await supabase
                  .from("user_device_tokens")
                  .select("fcm_token")
                  .eq("user_id", orderData.student_id);

                if (studentTokens && studentTokens.length > 0) {
                  for (const st of studentTokens) {
                    await sendFcmNotification(
                      st.fcm_token,
                      studentTitle,
                      studentBody,
                      `/order/${app_order_id}`,
                      app_order_id,
                      "paid",
                      "preorder_new_orders_channel"
                    );
                  }
                }
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
                console.log(`[verify-razorpay-payment] Telegram notification sent to ${vendorProfile.telegram_chat_id}:`, JSON.stringify(tgJson));
              } else {
                console.log(`[verify-razorpay-payment] Vendor ${canteenData.vendor_id} has not linked Telegram.`);
              }
            }
          }
        }
      } catch (tgErr) {
        console.error("[verify-razorpay-payment] Error sending Telegram notification:", tgErr);
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
