import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Resolve Auth User
          let user: any = null;
          const authHeader = request.headers.get("Authorization");
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (token && token !== "undefined") {
              const { data: { user: authUser } } = await supabase.auth.getUser(token);
              user = authUser;
            }
          }

          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();
          const { gateway = "stripe" } = body; // 'stripe' or 'mercadopago'

          const stripeKey = process.env.STRIPE_SECRET_KEY;
          const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

          const origin = request.headers.get("origin") || "http://localhost:5173";

          // If no gateway API keys are set, fallback to Mock Sandbox Checkout
          if (
            (gateway === "stripe" && !stripeKey) ||
            (gateway === "mercadopago" && !mpToken)
          ) {
            console.log(`[Checkout] Gateways offline. Retornando link mockado para ${gateway}`);
            
            // Simular início de pagamento
            const { data: payment } = await supabase
              .from("payments")
              .insert({
                profile_id: user.id,
                amount: 9.99,
                payment_method: gateway,
                status: "pending",
                external_transaction_id: `mock-${Date.now()}`,
              })
              .select()
              .single();

            // Retorna URL de sucesso simulando conclusão (passa paymentId na querystring)
            const sandboxRedirectUrl = `${origin}/vip?payment_id=${payment?.id}&mock_status=success`;
            return Response.json({ url: sandboxRedirectUrl });
          }

          if (gateway === "stripe") {
            // Stripe API call (mocking API fetch directly to avoid requiring heavy native SDKs at compile-time)
            const params = new URLSearchParams({
              "success_url": `${origin}/vip?success=true`,
              "cancel_url": `${origin}/vip?canceled=true`,
              "payment_method_types[0]": "card",
              "line_items[0][price_data][currency]": "brl",
              "line_items[0][price_data][product_data][name]": "Assinatura Clube VIP - Achadinhos",
              "line_items[0][price_data][unit_amount]": "999", // R$ 9,99
              "line_items[0][price_data][recurring][interval]": "month",
              "line_items[0][quantity]": "1",
              "mode": "subscription",
              "client_reference_id": user.id,
            });

            const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            });

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(`Stripe Checkout Session creation failed: ${errData.error?.message}`);
            }

            const session = await res.json();
            return Response.json({ url: session.url });
          } else {
            // Mercado Pago Preference API call
            // Reference: https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post
            const payload = {
              items: [
                {
                  title: "Assinatura Clube VIP - Achadinhos",
                  quantity: 1,
                  unit_price: 9.99,
                  currency_id: "BRL",
                },
              ],
              back_urls: {
                success: `${origin}/vip?success=true`,
                failure: `${origin}/vip?failed=true`,
                pending: `${origin}/vip?pending=true`,
              },
              auto_return: "approved",
              external_reference: user.id,
            };

            const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${mpToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(`Mercado Pago preference creation failed: ${JSON.stringify(errData)}`);
            }

            const pref = await res.json();
            return Response.json({ url: pref.init_point });
          }
        } catch (e: any) {
          console.error("Erro no checkout:", e);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
