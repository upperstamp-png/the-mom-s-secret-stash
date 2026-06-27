import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Bell, Crown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { OfferModal } from "@/components/OfferModal";
import { CategoryChips } from "@/components/CategoryChips";
import {
  PRODUCTS,
  type Product,
  type CategoryId,
  useRecommendedProducts,
} from "@/lib/products";
import { useProfile } from "@/lib/store";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clube Secreto de Achadinhos para Mamães" },
      {
        name: "description",
        content:
          "Feed exclusivo de ofertas de produtos infantis selecionadas para você. Entre no clube secreto das mamães.",
      },
      {
        property: "og:title",
        content: "Clube Secreto de Achadinhos para Mamães",
      },
      {
        property: "og:description",
        content: "Ofertas exclusivas de produtos infantis antes de todo mundo.",
      },
    ],
  }),
  component: HomePage,
});

const PAGE = 6;

function HomePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [active, setActive] = useState<CategoryId>("tudo");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const { data: dbProducts = [], isLoading: loading } = useRecommendedProducts();

  const filtered = useMemo(() => {
    const list = dbProducts.length > 0 ? dbProducts : PRODUCTS;
    const base =
      active === "tudo"
        ? list
        : list.filter((p) => p.category === active);
    const q = query.trim().toLowerCase();
    const byQuery = q
      ? base.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q),
        )
      : base;
    // simulate an infinite feed by cycling the catalog
    const out: Product[] = [];
    for (let i = 0; i < count; i++) {
      const item = byQuery[i % byQuery.length];
      if (item) out.push({ ...item, id: `${item.id}-${i}` });
    }
    return out;
  }, [dbProducts, active, query, count]);

  const [col1, col2] = useMemo(() => {
    const left: Product[] = [];
    const right: Product[] = [];
    filtered.forEach((p, idx) => {
      if (idx % 2 === 0) {
        left.push(p);
      } else {
        right.push(p);
      }
    });
    return [left, right];
  }, [filtered]);

  useEffect(() => {
    setCount(PAGE);
  }, [active, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((c) => c + PAGE);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const firstName = profile.name?.split(" ")[0] || "mamãe";

  return (
    <AppShell>
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 bg-background/60 px-4 py-2.5 backdrop-blur-xl border-b border-border/5 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 hover:bg-muted/75 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no clube..."
            className="w-full bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => navigate({ to: "/vip" })}
          aria-label="Clube VIP"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 active:scale-90 transition-all"
        >
          <Crown className="h-4.5 w-4.5" />
        </button>
        <button
          aria-label="Notificações"
          className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-muted/65 text-foreground active:scale-90 transition-all"
        >
          <Bell className="h-4.5 w-4.5 text-foreground" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
      </header>

      <CategoryChips active={active} onChange={setActive} />

      {/* Feed */}
      <main className="px-4 pt-4">
        {loading ? (
          <div className="flex gap-3 items-start">
            <div className="flex-1 flex flex-col gap-3">
              {[0, 2, 4].map((i) => {
                const aspect =
                  i % 3 === 0
                    ? "aspect-[9/16]"
                    : i % 3 === 1
                      ? "aspect-[9/14.5]"
                      : "aspect-[9/18]";
                return (
                  <div
                    key={i}
                    className={`skeleton w-full ${aspect} rounded-[24px]`}
                  />
                );
              })}
            </div>
            <div className="flex-1 flex flex-col gap-3 pt-8">
              {[1, 3, 5].map((i) => {
                const aspect =
                  i % 3 === 0
                    ? "aspect-[9/16]"
                    : i % 3 === 1
                      ? "aspect-[9/14.5]"
                      : "aspect-[9/18]";
                return (
                  <div
                    key={i}
                    className={`skeleton w-full ${aspect} rounded-[24px]`}
                  />
                );
              })}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 font-bold text-foreground">Nada por aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tenta outra busca ou categoria.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 items-start">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-3">
              {col1.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onOpen={setSelected}
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
                  onOpen={setSelected}
                  priority={i < 1}
                  index={i * 2 + 1}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={sentinel} className="h-10" />
      </main>

      <OfferModal product={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
