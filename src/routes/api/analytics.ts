import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Resolve Auth User (if token provided)
          let user: any = null;
          const authHeader = request.headers.get("Authorization");
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (token && token !== "undefined") {
              const { data: { user: authUser } } = await supabase.auth.getUser(token);
              user = authUser;
            }
          }

          const body = await request.json();
          const { product_id, event_type, metadata = {} } = body;

          if (!event_type) {
            return Response.json({ error: "Missing event_type" }, { status: 400 });
          }

          // Extract UTM query parameters from referrer if possible
          const referrer = request.headers.get("referer") || "";
          let utm_source = null;
          let utm_medium = null;
          let utm_campaign = null;
          try {
            if (referrer.includes("?")) {
              const params = new URLSearchParams(referrer.split("?")[1]);
              utm_source = params.get("utm_source");
              utm_medium = params.get("utm_medium");
              utm_campaign = params.get("utm_campaign");
            }
          } catch (pe) {
            // Ignore parse errors
          }

          // 2. Insert event
          const { error } = await supabase.from("analytics_events").insert({
            profile_id: user?.id || null,
            event_type,
            product_id: product_id || null,
            utm_source,
            utm_medium,
            utm_campaign,
            metadata,
          });

          if (error) throw error;

          // 3. If affiliate click, record click log too
          if (event_type === "click_affiliate") {
            await supabase.from("clicks").insert({
              profile_id: user?.id || null,
              product_id: product_id || null,
              referrer,
            });
            
            // Increment click counter on affiliate links
            if (product_id) {
              const { data: affLink } = await supabase
                .from("affiliate_links")
                .select("id, clicks_count")
                .eq("product_id", product_id)
                .maybeSingle();

              if (affLink) {
                await supabase
                  .from("affiliate_links")
                  .update({ clicks_count: affLink.clicks_count + 1 })
                  .eq("id", affLink.id);
              } else {
                // Create link if missing
                await supabase.from("affiliate_links").insert({
                  product_id,
                  destination_url: "https://redirect.clube.app",
                  clicks_count: 1
                });
              }
            }
          }

          return Response.json({ success: true });
        } catch (e: any) {
          console.error("Erro ao registrar analytics:", e);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
