import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/api/recommendations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

          // 2. Fetch all active products
          const { data: dbProducts, error: prodErr } = await supabase
            .from("products")
            .select(`
              id,
              title,
              description,
              image_url,
              video_url,
              price,
              old_price,
              marketplace,
              category_id,
              brand,
              coupon_id,
              cashback,
              affiliate_link,
              vip_only,
              hot,
              score_ai,
              popularity,
              slug,
              coupons (code)
            `)
            .eq("available", true);

          if (prodErr || !dbProducts) {
            return Response.json({ products: [] });
          }

          // Format to match the client Product type
          const formattedProducts = dbProducts.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description || "",
            image: p.image_url,
            video: p.video_url || undefined,
            price: Number(p.price),
            oldPrice: Number(p.old_price),
            marketplace: p.marketplace,
            brand: p.brand || "",
            category: p.category_id,
            coupon: p.coupons?.code || undefined,
            vipOnly: p.vip_only,
            hot: p.hot,
          }));

          // 3. If guest (not authenticated), return products sorted by popularity
          if (!user) {
            const sorted = [...formattedProducts].sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
            return Response.json({ products: sorted });
          }

          const userId = user.id;

          // 4. Authenticated: Fetch user profile details
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          const { data: children } = await supabase
            .from("children")
            .select("*")
            .eq("profile_id", userId);

          const { data: interests } = await supabase
            .from("interests")
            .select("category_id")
            .eq("profile_id", userId);

          const { data: favorites } = await supabase
            .from("favorites")
            .select("product_id")
            .eq("profile_id", userId);

          const interestIds = interests ? interests.map((i: any) => i.category_id) : [];
          const favoriteIds = favorites ? favorites.map((f: any) => f.product_id) : [];

          // 5. Score Algorithm
          const scored = formattedProducts.map((product) => {
            let score = 0;

            // Interest Match (+3 points)
            if (interestIds.includes(product.category)) {
              score += 3;
            }

            // Age brackets matching (+5 points)
            if (children && children.length > 0) {
              children.forEach((child: any) => {
                const age = child.age_months;
                if (age <= 12) {
                  // Baby
                  if (["fraldas", "mamadeiras", "carrinhos"].includes(product.category)) {
                    score += 5;
                  }
                } else if (age <= 36) {
                  // Toddler
                  if (["brinquedos", "carrinhos", "roupas"].includes(product.category)) {
                    score += 3;
                  }
                } else {
                  // Kids
                  if (["escolar", "brinquedos", "calcados"].includes(product.category)) {
                    score += 4;
                  }
                }
              });
            }

            // Popularity & Hot badges (+1 point)
            if (product.hot) score += 1;

            // Favorite match (+2 points)
            if (favoriteIds.includes(product.id)) {
              score += 2;
            }

            return { product, score };
          });

          // Sort by score descending
          const sortedProducts = scored
            .sort((a, b) => b.score - a.score)
            .map((item) => item.product);

          return Response.json({ products: sortedProducts });
        } catch (e: any) {
          console.error("Erro no feed de recomendações:", e);
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
