import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../../lib/supabase";
import { AmazonAdapter } from "../../../lib/adapters/amazon";
import { ShopeeAdapter } from "../../../lib/adapters/shopee";
import { MercadoLivreAdapter } from "../../../lib/adapters/mercadolivre";
import { MagaluAdapter } from "../../../lib/adapters/magalu";
import { AliExpressAdapter } from "../../../lib/adapters/aliexpress";
import { TemuAdapter } from "../../../lib/adapters/temu";
import { SheinAdapter } from "../../../lib/adapters/shein";

const ADAPTERS = [
  new AmazonAdapter(),
  new ShopeeAdapter(),
  new MercadoLivreAdapter(),
  new MagaluAdapter(),
  new AliExpressAdapter(),
  new TemuAdapter(),
  new SheinAdapter(),
];

const SEARCH_QUERIES = [
  "fraldas",
  "bodies bebe",
  "brinquedos educativos",
  "carrinho de bebe",
  "mamadeiras",
  "tenis infantil",
  "mochila infantil",
];

export const Route = createFileRoute("/api/cron/crawler")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const urlObj = new URL(request.url);
        const secret = urlObj.searchParams.get("secret");
        const cronSecret =
          (typeof process !== "undefined" ? process.env.CRON_SECRET : null) ||
          "super-secret-cron-token";

        if (secret !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const logs: string[] = [];
        let totalImported = 0;

        for (const adapter of ADAPTERS) {
          logs.push(`Starting crawler for ${adapter.name}...`);

          // Create a crawler job log
          const { data: job, error: jobErr } = await supabase
            .from("crawler_jobs")
            .insert({
              marketplace: adapter.name,
              status: "running",
              products_imported: 0,
            })
            .select()
            .single();

          if (jobErr) {
            console.error("Failed to create crawler job log:", jobErr);
            continue;
          }

          try {
            let importedForAdapter = 0;

            for (const query of SEARCH_QUERIES) {
              const rawProducts = await adapter.fetchOffers(query);

              for (const rp of rawProducts) {
                // 1. Resolve Category
                let catId = "tudo";
                if (query.includes("fralda")) catId = "fraldas";
                else if (query.includes("bodies") || query.includes("plush")) catId = "roupas";
                else if (query.includes("brinquedos")) catId = "brinquedos";
                else if (query.includes("carrinho")) catId = "carrinhos";
                else if (query.includes("mamadeira")) catId = "mamadeiras";
                else if (query.includes("tenis") || query.includes("sapato")) catId = "calcados";
                else if (query.includes("mochila") || query.includes("escolar")) catId = "escolar";

                // 2. Upsert Coupon if exists
                let couponId = null;
                if (rp.couponCode) {
                  const { data: coupon } = await supabase
                    .from("coupons")
                    .upsert(
                      {
                        code: rp.couponCode,
                        discount_value: "Desconto",
                        description: `Cupom ${rp.couponCode} para desconto extra`,
                      },
                      { onConflict: "code" }
                    )
                    .select()
                    .single();
                  couponId = coupon?.id || null;
                }

                // Generate slug
                const slug = rp.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");

                // 3. Fetch existing product to track price drops
                const { data: existingProd } = await supabase
                  .from("products")
                  .select("id, price")
                  .eq("slug", slug)
                  .maybeSingle();

                // 4. Upsert Product
                const { data: upsertedProd, error: upsertErr } = await supabase
                  .from("products")
                  .upsert(
                    {
                      id: existingProd?.id || undefined,
                      title: rp.title,
                      description: rp.description,
                      image_url: rp.imageUrl,
                      price: rp.price,
                      old_price: rp.oldPrice,
                      marketplace: adapter.name,
                      category_id: catId,
                      brand: rp.brand,
                      coupon_id: couponId,
                      affiliate_link: rp.affiliateUrl,
                      slug: slug,
                      available: rp.available,
                      score_ai: 5.0,
                      vip_only: query.includes("carrinho") || query.includes("plush"),
                    },
                    { onConflict: "slug" }
                  )
                  .select()
                  .single();

                if (upsertErr) {
                  logs.push(`Error upserting ${rp.title}: ${upsertErr.message}`);
                  continue;
                }

                if (upsertedProd) {
                  importedForAdapter++;
                  totalImported++;

                  // 5. Record price history changes
                  if (!existingProd || Number(existingProd.price) !== rp.price) {
                    await supabase.from("price_history").insert({
                      product_id: upsertedProd.id,
                      price: rp.price,
                    });
                  }
                }
              }
            }

            // Update job status to success
            await supabase
              .from("crawler_jobs")
              .update({
                status: "success",
                products_imported: importedForAdapter,
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            logs.push(
              `Successfully finished ${adapter.name}. Imported ${importedForAdapter} products.`
            );
          } catch (e: any) {
            console.error(`Crawler failed for adapter ${adapter.name}:`, e);
            await supabase
              .from("crawler_jobs")
              .update({
                status: "failed",
                error_message: e.message || "Erro desconhecido",
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            logs.push(`Crawler failed for adapter ${adapter.name}: ${e.message}`);
          }
        }

        return Response.json({
          status: "completed",
          total_imported: totalImported,
          logs: logs,
        });
      },
    },
  },
});
