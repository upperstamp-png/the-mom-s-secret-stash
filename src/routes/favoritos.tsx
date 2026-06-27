import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { OfferModal } from "@/components/OfferModal";
import { PRODUCTS, type Product, useRecommendedProducts } from "@/lib/products";
import { useFavorites } from "@/lib/store";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Clube Secreto de Achadinhos" },
      {
        name: "description",
        content: "Sua lista de achadinhos salvos para comprar depois.",
      },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const [product, setProduct] = useState<Product | null>(null);

  const { data: dbProducts = [] } = useRecommendedProducts();
  const activeProducts = dbProducts.length > 0 ? dbProducts : PRODUCTS;

  const saved = useMemo(() => {
    return favorites
      .map((id) => activeProducts.find((p) => p.id === id.split("-")[0]))
      .filter((p): p is Product => Boolean(p));
  }, [favorites, activeProducts]);

  const [col1, col2] = useMemo(() => {
    const left: Product[] = [];
    const right: Product[] = [];
    saved.forEach((p, idx) => {
      if (idx % 2 === 0) {
        left.push(p);
      } else {
        right.push(p);
      }
    });
    return [left, right];
  }, [saved]);

  const share = async () => {
    const text = "Olha os achadinhos que separei no Clube Secreto! 🧡";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Meus Favoritos", text });
      } catch {
        /* cancelled */
      }
    } else {
      navigator.clipboard?.writeText(text);
      toast.success("Lista copiada para compartilhar!");
    }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/85 px-4 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Favoritos</h1>
          <p className="text-xs text-muted-foreground">
            {saved.length} achadinhos salvos
          </p>
        </div>
        {saved.length > 0 && (
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-bold text-foreground shadow-soft active:scale-95"
          >
            <Share2 className="h-4 w-4 text-primary" /> Compartilhar
          </button>
        )}
      </header>

      <main className="px-4">
        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent">
              <Heart className="h-9 w-9 text-primary" />
            </span>
            <p className="mt-5 text-lg font-extrabold text-foreground">
              Nenhum favorito ainda
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Toque no coração dos achadinhos para guardá-los aqui e comprar
              depois.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-6 rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow active:scale-95"
            >
              Explorar achadinhos
            </button>
          </div>
        ) : (
          <div className="flex gap-3 items-start pt-4">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-3">
              {col1.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onOpen={setProduct}
                  priority={i < 1}
                  index={i * 2}
                />
              ))}
            </div>
            {/* Right Column (Staggered offset) */}
            <div className="flex-1 flex flex-col gap-3 pt-8">
              {col2.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onOpen={setProduct}
                  priority={i < 1}
                  index={i * 2 + 1}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <OfferModal product={product} onClose={() => setProduct(null)} />
    </AppShell>
  );
}
