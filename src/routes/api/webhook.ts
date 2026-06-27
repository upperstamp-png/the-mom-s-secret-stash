import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature = request.headers.get("stripe-signature");
          const urlObj = new URL(request.url);
          const source = urlObj.searchParams.get("source") || "stripe";

          let userId: string | null = null;
          let paymentId: string | null = null;
          let amount = 9.99;
          let transactionId = "";

          if (source === "stripe") {
            const rawBody = await request.text();
            let event: any;
            try {
              event = JSON.parse(rawBody);
            } catch (err) {
              return new Response("Invalid JSON payload", { status: 400 });
            }

            // In production, verify Stripe Webhook signature
            // const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);

            const session = event.data?.object;
            if (event.type === "checkout.session.completed") {
              userId = session.client_reference_id;
              transactionId = session.id;
              amount = (session.amount_total || 999) / 100;
            } else {
              return Response.json({ received: true }); // Ignore other event types safely
            }
          } else if (source === "mercadopago") {
            // Mercado Pago webhook
            // Reference: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
            const body = await request.json();
            const resourceId = body.data?.id;

            if (body.type === "payment" && resourceId) {
              const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
              
              // Fetch payment details from Mercado Pago
              const res = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: {
                  Authorization: `Bearer ${mpToken}`,
                },
              });

              if (!res.ok) throw new Error("Failed to fetch MP payment details");
              const paymentDetails = await res.json();

              if (paymentDetails.status === "approved") {
                userId = paymentDetails.external_reference;
                transactionId = String(paymentDetails.id);
                amount = paymentDetails.transaction_amount || 9.99;
              }
            }
          }

          if (userId) {
            await upgradeUserToVip(userId, amount, transactionId, source);
          }

          return Response.json({ received: true });
        } catch (e: any) {
          console.error("Erro no Webhook:", e);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});

async function upgradeUserToVip(
  userId: string,
  amount: number,
  transactionId: string,
  gateway: string
) {
  // 1. Create or update payment log
  const { data: payment } = await supabase
    .from("payments")
    .upsert(
      {
        profile_id: userId,
        amount: amount,
        payment_method: gateway,
        status: "paid",
        external_transaction_id: transactionId,
      },
      { onConflict: "external_transaction_id" }
    )
    .select()
    .single();

  if (!payment) return;

  // 2. Create order
  const { data: order } = await supabase
    .from("orders")
    .insert({
      profile_id: userId,
      payment_id: payment.id,
      status: "active",
      total: amount,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (!order) return;

  // 3. Create VIP Member details
  await supabase.from("vip_members").upsert({
    profile_id: userId,
    order_id: order.id,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: order.expires_at,
    whatsapp_group_joined: false,
  });

  // 4. Update main profile vip status
  await supabase.from("profiles").update({ vip: true }).eq("id", userId);

  // 5. Send push notification / email to notify user
  // Trigger system notification
  await supabase.from("notifications").insert({
    title: "Parabéns, você é VIP! 🧡",
    body: "Seu acesso foi liberado. Toque aqui para entrar no grupo exclusivo do WhatsApp.",
    scheduled_for: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    status: "sent",
    target_segment: { profile_id: userId },
  });
}
